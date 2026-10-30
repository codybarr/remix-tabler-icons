import { createIconSearch } from "./search.ts";
import type { IconRecord, SearchResults, StyleFilter } from "./shared.ts";

export type Manifest = { version: string; counts: SearchResults["counts"]; icons: IconRecord[] };
type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

/** No Bun APIs at runtime: SVG rendering happens during the website build. */
export function createWorker(manifest: Manifest) {
  const search = createIconSearch(manifest);
  const icons = new Set(manifest.icons.map(icon => icon.component));
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      }
      const response = await handle(request, env);
      return request.method === "HEAD" ? new Response(null, response) : response;
    },
  };

  async function handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 302, headers: { Location: "/api/icons/IconGridDots" } });
    }
    if (url.pathname === "/api/search") {
      const style = url.searchParams.get("style") || "all";
      if (!["all", "outline", "filled"].includes(style)) return Response.json({ error: "Unknown style" }, { status: 400 });
      return Response.json(search(url.searchParams.get("q") || "", style as StyleFilter, Number(url.searchParams.get("page") || 1)));
    }
    if (url.pathname.startsWith("/api/icons/")) {
      const component = url.pathname.slice("/api/icons/".length);
      if (!icons.has(component)) return new Response("Icon not found", { status: 404 });
      const headers = {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        ETag: `"${manifest.version}-${component}"`,
      };
      if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
      url.pathname = `/icon-assets/${component}.svg`;
      url.search = "";
      const asset = await env.ASSETS.fetch(new Request(url));
      if (!asset.ok) return asset;
      return new Response(asset.body, { headers });
    }
    if (url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    if (["/", "/icons", "/icons/"].includes(url.pathname)) url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
}
