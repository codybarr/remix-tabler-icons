import { renderToString } from "remix/component/server";
import { createElement, type Handle, type RemixElement } from "remix/component";
import type { IconProps } from "../src/icon.ts";
import html from "./index.html";
import { createIconSearch } from "./search.ts";
import type { IconRecord, StyleFilter } from "./shared.ts";

const manifestFile = Bun.file(new URL("../generated/manifest.json", import.meta.url));
if (!await manifestFile.exists()) throw new Error("Run `bun run generate` before starting the website.");
const manifest = await manifestFile.json();
const search = createIconSearch(manifest);
const iconLookup = new Map<string, IconRecord>(manifest.icons.map((icon: IconRecord) => [icon.component, icon]));
// Cache promises too: concurrent requests for an icon share import/render work.
const svgCache = new Map<string, Promise<string>>();

const server = Bun.serve({
  hostname: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 3000),
  routes: {
    "/": html,
    "/icons": html,
    "/favicon.ico": () => new Response(null, { status: 302, headers: { Location: "/api/icons/IconGridDots" } }),
    "/api/search": (req) => {
      const url = new URL(req.url);
      const style = url.searchParams.get("style") || "all";
      if (!["all", "outline", "filled"].includes(style)) return Response.json({ error: "Unknown style" }, { status: 400 });
      return Response.json(search(url.searchParams.get("q") || "", style as StyleFilter, Number(url.searchParams.get("page") || 1)));
    },
    "/api/icons/:component": async (req) => {
      const icon = iconLookup.get(req.params.component);
      if (!icon) return new Response("Icon not found", { status: 404 });
      const etag = `"${manifest.version}-${icon.component}"`;
      const headers = {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        ETag: etag,
      };
      if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
      let svg = svgCache.get(icon.component);
      if (!svg) {
        svg = (async () => {
          // The path can only come from the trusted local manifest, never request input.
          const module = await import(`../generated/${icon.style}/${icon.component}.tsx`);
          const component = module[icon.component] as (handle: Handle<IconProps>) => () => RemixElement;
          return renderToString(createElement(component, { size: 24 }));
        })();
        svgCache.set(icon.component, svg);
      }
      try { return new Response(await svg, { headers }); }
      catch (error) {
        svgCache.delete(icon.component);
        console.error(`Could not render ${icon.component}`, error);
        return new Response("Could not render icon", { status: 500 });
      }
    },
  },
  fetch() { return new Response("Not found", { status: 404 }); },
  development: process.env.NODE_ENV === "production" ? false : { hmr: true, console: true },
});
console.log(`Icon website: ${server.url}`);
