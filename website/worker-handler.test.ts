import { expect, test } from "bun:test";
import { createWorker } from "./worker-handler.ts";

const manifest = {
  version: "v3.50.0", counts: { outline: 1, filled: 0 },
  icons: [{ name: "heart", component: "IconHeart", style: "outline" as const }],
};
const worker = createWorker(manifest);
const assets = { fetch: async (request: Request) => new Response(new URL(request.url).pathname) };
const request = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://example.com${path}`, init), { ASSETS: assets });

test("Worker serves bounded search results and rejects invalid styles", async () => {
  const response = await request("/api/search?q=heart&style=outline");
  expect(await response.json()).toMatchObject({ total: 1, icons: manifest.icons });
  expect((await request("/api/search?style=invalid")).status).toBe(400);
});

test("Worker serves only known SVGs with cache headers and conditional requests", async () => {
  const response = await request("/api/icons/IconHeart");
  expect(await response.text()).toBe("/icon-assets/IconHeart.svg");
  expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
  expect(response.headers.get("cache-control")).toContain("max-age=86400");
  expect((await request("/api/icons/IconHeart", { headers: { "if-none-match": response.headers.get("etag")! } })).status).toBe(304);
  expect((await request("/api/icons/Unknown")).status).toBe(404);
});

test("Worker serves both pages, redirects favicon, and preserves asset 404s", async () => {
  for (const path of ["/", "/icons", "/icons/"]) expect(await (await request(path)).text()).toBe("/index.html");
  expect((await request("/favicon.ico")).headers.get("location")).toBe("/api/icons/IconGridDots");
  expect((await request("/api/unknown")).status).toBe(404);
  expect((await request("/api/search", { method: "POST" })).status).toBe(405);
  expect((await request("/api/icons/IconHeart", { method: "HEAD" })).body).toBeNull();
});
