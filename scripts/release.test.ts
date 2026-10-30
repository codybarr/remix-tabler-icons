import { afterAll, expect, test } from "bun:test";
import { exists, packageVersion } from "./release.ts";

const server = Bun.serve({
  port: 0,
  fetch(request) {
    return new Response(null, { status: Number(new URL(request.url).pathname.slice(1)) });
  },
});
afterAll(() => server.stop(true));

test("release versions match stable upstream tags", () => {
  expect(packageVersion("v3.50.0")).toBe("3.50.0");
  for (const tag of ["3.50.0", "v3.50.0-beta.1", "latest", "v3.50.0\n"]) {
    expect(() => packageVersion(tag)).toThrow();
  }
});

test("only a 404 is considered an unpublished release", async () => {
  expect(await exists(new URL("/200", server.url).href)).toBe(true);
  expect(await exists(new URL("/404", server.url).href)).toBe(false);
  for (const status of [401, 403, 429, 500, 503]) {
    await expect(exists(new URL(`/${status}`, server.url).href)).rejects.toThrow(`(${status})`);
  }
});
