import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createElement } from "remix/component";
import { renderToString } from "remix/component/server";

const root = resolve(import.meta.dir, "..");
const temp = await mkdtemp(resolve(root, ".generated-package-check-"));
afterAll(() => rm(temp, { recursive: true, force: true }));

for (const [specifier, icon, unused] of [
  ["@nosweat/remix-tabler-icons", "IconHeart", "IconHeartFilled"],
  ["@nosweat/remix-tabler-icons/outline", "IconHeart", "IconActivity"],
  ["@nosweat/remix-tabler-icons/filled", "IconHeartFilled", "IconActivityFilled"],
  ["@nosweat/remix-tabler-icons/outline/IconHeart", "IconHeart", "IconActivity"],
  ["@nosweat/remix-tabler-icons/filled/IconHeartFilled", "IconHeartFilled", "IconActivityFilled"],
] as const) {
  test(`${specifier}: importing one icon bundles exactly one component`, async () => {
    const entrypoint = resolve(temp, `${icon}-${specifier.replaceAll("/", "-")}.ts`);
    await Bun.write(entrypoint, `export { ${icon} } from ${JSON.stringify(specifier)};`);
    const result = await Bun.build({
      entrypoints: [entrypoint], target: "browser", minify: false,
      external: ["remix/*"],
    });
    expect(result.success).toBe(true);
    const js = await result.outputs[0]!.text();
    expect(js).toContain(`function ${icon}(`);
    expect(js).not.toContain(unused);
    expect(js.match(/function Icon[A-Z]\w*\(/g)).toHaveLength(1);
    expect(js).toContain("remix/component/jsx-runtime");
    expect(js).not.toContain("react/jsx-runtime");
    expect(js.length).toBeLessThan(5000);
  });
}

test("compiled ESM renders in Remix without TSX transpilation", async () => {
  const { IconHeart } = await import("@nosweat/remix-tabler-icons/outline/IconHeart");
  const html = await renderToString(createElement(IconHeart, { title: "Love", size: 32 }));
  expect(html).toContain('width="32"');
  expect(html).toContain("<title>Love</title>");
  expect(html).toContain("<path");
});

test("npm tarball contains compiled modules, declarations, provenance and license only", async () => {
  const filename = resolve(temp, "package.tgz");
  const pack = Bun.spawn(["bun", "pm", "pack", "--ignore-scripts", "--quiet", "--filename", filename], {
    cwd: root, stdout: "pipe", stderr: "pipe",
  });
  const stderr = new Response(pack.stderr).text();
  expect(await pack.exited, await stderr).toBe(0);
  const files = await new Bun.Archive(await Bun.file(filename).arrayBuffer()).files();
  const paths = [...files.keys()];
  expect(paths).toContain("package/dist/TABLER-LICENSE");
  expect(paths).toContain("package/dist/manifest.json");
  expect(paths).toContain("package/dist/index.d.ts");
  expect(paths).toContain("package/dist/generated/outline/IconHeart.js");
  expect(paths).toContain("package/dist/generated/outline/IconHeart.d.ts");
  expect(paths).toContain("package/dist/generated/filled/IconHeartFilled.js");
  expect(paths.every(path => /^package\/(dist\/|README.md$|package.json$)/.test(path))).toBe(true);
  expect(paths.some(path => /\.tsx$/.test(path))).toBe(false);
  const pkg = await files.get("package/package.json")!.json();
  expect(pkg.name).toBe("@nosweat/remix-tabler-icons");
  expect(pkg.version).toBe((await Bun.file(resolve(root, "package.json")).json()).version);
  expect(pkg.publishConfig).toEqual({ access: "public", registry: "https://registry.npmjs.org/", tag: "latest" });
  expect(pkg.private).not.toBe(true);
  expect(pkg.sideEffects).toBe(false);
  expect(pkg.peerDependencies).toEqual({ remix: "^3.1.0" });
  for (const path of paths.filter(path => path.endsWith(".d.ts"))) {
    const declaration = await files.get(path)!.text();
    if (/from ["'][^"']+\.tsx?["']/.test(declaration) || declaration.includes('from "@remix-run/')) {
      throw new Error(`Declaration depends on unpublished source or a transitive package: ${path}`);
    }
  }
}, 30_000);
