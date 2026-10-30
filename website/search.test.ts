import { expect, test } from "bun:test";
import { createIconSearch } from "./search.ts";
import { iconExample, iconImport, installCommands, PAGE_SIZE, type IconRecord } from "./shared.ts";

const icons: IconRecord[] = [
  { name: "device-heart-monitor", component: "IconDeviceHeartMonitor", style: "outline" },
  { name: "heart-broken", component: "IconHeartBroken", style: "outline" },
  { name: "heart", component: "IconHeartFilled", style: "filled" },
  { name: "heart", component: "IconHeart", style: "outline" },
  { name: "arrow-left", component: "IconArrowLeft", style: "outline" },
];
const search = createIconSearch({ icons, counts: { outline: 4, filled: 1 }, version: "v3.50.0" });

test("search ranks exact names before prefixes before partial matches", () => {
  expect(search("heart", "all").icons.map(icon => icon.name)).toEqual(["heart", "heart", "heart-broken", "device-heart-monitor"]);
  expect(search("iconheart", "all").icons[0]?.component).toBe("IconHeart");
});

test("search matches case-insensitive names, component names and multiple words", () => {
  expect(search("  HEART  ", "all").total).toBe(4);
  expect(search("heart monitor", "all").icons[0]?.name).toBe("device-heart-monitor");
  expect(search("IconArrowLeft", "all").icons[0]?.name).toBe("arrow-left");
});

test("search filters both styles and provides useful empty results", () => {
  expect(search("heart", "filled").icons.map(icon => icon.component)).toEqual(["IconHeartFilled"]);
  expect(search("heart", "outline").total).toBe(3);
  expect(search("no-such-icon", "all")).toMatchObject({ icons: [], total: 0, page: 1, pages: 0 });
});

test("search is bounded, clamps invalid pages and does not mutate the manifest", () => {
  const input = Array.from({ length: PAGE_SIZE * 2 + 1 }, (_, i) => ({ name: `icon-${String(i).padStart(3, "0")}`, component: `Icon${i}`, style: "outline" as const }));
  const many = createIconSearch({ icons: input, counts: { outline: input.length, filled: 0 }, version: "test" });
  expect(many("", "all").icons).toHaveLength(PAGE_SIZE);
  expect(many("", "all", 999)).toMatchObject({ page: 3, pages: 3, total: input.length });
  expect(many("", "all", 999).icons).toHaveLength(1);
  for (const page of [-1, 0, NaN, Infinity]) expect(many("", "all", page).page).toBe(1);
  expect(icons[0]?.name).toBe("device-heart-monitor");
});

test("usage snippets use scoped, individual imports and native Remix closures", () => {
  const icon = icons[2]!;
  expect(iconImport(icon)).toContain('@nosweat/remix-tabler-icons/filled/IconHeartFilled');
  expect(iconExample(icon)).toContain("return () => (");
  expect(iconExample(icon)).toContain("<IconHeartFilled");
  expect(installCommands.npm).toBe("npm install @nosweat/remix-tabler-icons");
  expect(installCommands.pnpm).toBe("pnpm add @nosweat/remix-tabler-icons");
  expect(installCommands.bun).toBe("bun add @nosweat/remix-tabler-icons");
});
