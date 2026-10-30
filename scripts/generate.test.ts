import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createElement, type Handle } from "remix/component";
import { renderToString } from "remix/component/server";
import type { IconProps } from "../src/icon.ts";
import { generate } from "./generate.ts";
import { componentName, convertSvg } from "./svg.ts";

const svg = `<!-- upstream metadata --><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><g><path d="M1 2l3 4" /></g></svg>`;
const root = await mkdtemp(resolve(import.meta.dir, "../.generated-test-"));
afterAll(() => rm(root, { recursive: true, force: true }));
const fixture = (outline = svg) => new Bun.Archive({
  "tabler-test/icons/outline/heart.svg": outline,
  "tabler-test/icons/filled/heart.svg": svg.replace('fill="none"', 'fill="currentColor"'),
  "tabler-test/LICENSE": "MIT fixture license",
  "tabler-test/packages/react/ignore.svg": svg,
});

test("names are valid, deterministic and style-specific", () => {
  expect(componentName("123-test", "outline")).toBe("Icon123Test");
  expect(componentName("heart", "filled")).toBe("IconHeartFilled");
  expect(() => componentName("../bad", "outline")).toThrow();
});

test("converts raw SVG geometry to a Remix render closure", () => {
  const source = convertSvg(svg, "heart", "outline");
  expect(source).toContain("Handle<IconProps>");
  expect(source).toContain("handle.props");
  expect(source).toContain('<g ><path d={"M1 2l3 4"} /></g>');
  expect(source).not.toContain("upstream metadata");
  expect(source).not.toContain("react");
});

test("rejects malformed, empty and executable SVGs", () => {
  for (const bad of ["<svg><path></svg>", "<svg/>", "<html/>", '<svg onload="alert(1)"><path/></svg>', "<svg><script/></svg>", '<!DOCTYPE svg><svg><path/></svg>']) {
    expect(() => convertSvg(bad, "bad", "outline")).toThrow();
  }
});

test("generates both styles, exports, license and provenance; renders with Remix 3.1", async () => {
  expect(await generate(fixture(), "v1.2.3", root)).toEqual({ outline: 1, filled: 1 });
  const manifest = await Bun.file(resolve(root, "generated/manifest.json")).json();
  expect(manifest.version).toBe("v1.2.3");
  expect(manifest.icons).toHaveLength(2);
  expect(await Bun.file(resolve(root, "generated/LICENSE")).text()).toBe("MIT fixture license");
  const { IconHeart, IconHeartFilled } = await import(resolve(root, "generated/index.ts"));
  const html = await renderToString(createElement(IconHeart, { size: 32, title: "Love <3", stroke: "red", strokeWidth: 1.5, "data-test": "heart" }));
  expect(html).toContain('width="32"');
  expect(html).toContain('height="32"');
  expect(html).toContain('stroke="red"');
  expect(html.match(/stroke-width=/g)).toHaveLength(1);
  expect(html).toContain('stroke-width="1.5"');
  expect(html).toContain("Love &lt;3");
  expect(html).not.toContain("aria-hidden");
  expect(html).toContain('data-test="heart"');
  const filled = await renderToString(createElement(IconHeartFilled, {}));
  expect(filled).toContain('fill="currentColor"');
  expect(filled).toContain('aria-hidden="true"');
  const labelled = await renderToString(createElement(IconHeart, { "aria-label": "Love" }));
  expect(labelled).not.toContain("aria-hidden");

  // Reading props must happen in render, not setup, so parent updates work.
  const handle = { props: { size: 16 } } as Handle<IconProps>;
  const render = IconHeart(handle);
  expect(await renderToString(render())).toContain('width="16"');
  handle.props.size = 48;
  expect(await renderToString(render())).toContain('width="48"');
});

test("failed generation preserves existing output and successful regeneration removes stale files", async () => {
  await generate(fixture(), "v1.2.3", root);
  const path = resolve(root, "generated/manifest.json");
  const before = await Bun.file(path).text();
  await expect(generate(fixture("<svg/>"), "v1.2.4", root)).rejects.toThrow();
  expect(await Bun.file(path).text()).toBe(before);
  await expect(generate(new Bun.Archive({ "repo/icons/outline/heart.svg": svg }), "v1.2.4", root)).rejects.toThrow("filled");
  expect(await Bun.file(path).text()).toBe(before);
  await Bun.write(resolve(root, "generated/stale.ts"), "stale");
  await generate(fixture(), "v1.2.4", root);
  expect(await Bun.file(resolve(root, "generated/stale.ts")).exists()).toBe(false);
});
