import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createElement, type Handle, type RemixElement } from "remix/component";
import { renderToString } from "remix/component/server";
import type { IconProps } from "../src/icon.ts";
import type { IconRecord } from "../website/shared.ts";

const root = resolve(import.meta.dir, "..");
const output = resolve(root, "dist-website");

// Clean checkouts have no generated sources. Existing generations stay pinned.
if (!await Bun.file(resolve(root, "generated/manifest.json")).exists()) {
  const generation = Bun.spawn(["bun", "run", "generate"], { cwd: root, stdout: "inherit", stderr: "inherit" });
  if (await generation.exited !== 0) throw new Error("Icon generation failed");
}

await rm(output, { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: [resolve(root, "website/index.html")],
  outdir: output,
  target: "browser",
  minify: true,
  naming: { entry: "[name].[ext]", chunk: "[name]-[hash].[ext]", asset: "[name]-[hash].[ext]" },
});
if (!result.success) throw new AggregateError(result.logs, "Website build failed");

const manifest = await Bun.file(resolve(root, "generated/manifest.json")).json() as { icons: IconRecord[] };
for (const icon of manifest.icons) {
  const module = await import(resolve(root, `generated/${icon.style}/${icon.component}.tsx`));
  const component = module[icon.component] as (handle: Handle<IconProps>) => () => RemixElement;
  const svg = await renderToString(createElement(component, { size: 24 }));
  await Bun.write(resolve(output, `icon-assets/${icon.component}.svg`), svg);
}
await Bun.write(resolve(output, "TABLER-LICENSE"), Bun.file(resolve(root, "generated/LICENSE")));
console.log(`Built website and ${manifest.icons.length} SVG assets in dist-website/`);
