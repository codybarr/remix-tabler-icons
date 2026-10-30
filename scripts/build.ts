import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

/** Preserve the ESM module graph: one output module per source, with no bundled runtime. */
export async function build() {
  if (!await Bun.file(resolve(root, "generated/manifest.json")).exists()) {
    throw new Error("Generated icons are missing. Run `bun run generate` before building.");
  }
  const dist = resolve(root, "dist");
  await rm(dist, { recursive: true, force: true });
  const declaration = Bun.spawn(["bunx", "--no-install", "tsc", "--project", "tsconfig.build.json"], {
    cwd: root, stdout: "inherit", stderr: "inherit",
  });
  if (await declaration.exited !== 0) throw new Error("Declaration build failed");

  const transpiler = new Bun.Transpiler({
    loader: "tsx",
    target: "browser",
    autoImportJSX: true,
    tsconfig: { compilerOptions: { jsx: "react-jsx", jsxImportSource: "remix/component" } },
  });
  const sources = ["index.ts", "src/icon.ts"];
  for await (const path of new Bun.Glob("generated/**/*.{ts,tsx}").scan({ cwd: root })) sources.push(path);
  for (const path of sources.sort()) {
    const destination = path.replace(/\.tsx?$/, ".js");
    const source = await Bun.file(resolve(root, path)).text();
    const js = transpiler.transformSync(source)
      .replace(/(\bfrom\s+["'][^"']+)\.tsx?(["'])/g, "$1.js$2");
    await Bun.write(resolve(dist, destination), js);
  }
  // TypeScript preserves .ts/.tsx specifiers in declarations; published types must
  // resolve the matching .d.ts files, not depend on unpublished TypeScript sources.
  for await (const path of new Bun.Glob("**/*.d.ts").scan({ cwd: dist })) {
    const file = Bun.file(resolve(dist, path));
    await Bun.write(file, (await file.text()).replace(/(\bfrom\s+["'][^"']+)\.tsx?(["'])/g, "$1.js$2"));
  }
  await Bun.write(resolve(dist, "TABLER-LICENSE"), Bun.file(resolve(root, "generated/LICENSE")));
  await Bun.write(resolve(dist, "manifest.json"), Bun.file(resolve(root, "generated/manifest.json")));
  console.log(`Built ${sources.length} ESM modules and declarations in dist/`);
}

if (import.meta.main) {
  try { await build(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
