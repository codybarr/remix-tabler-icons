import { PAGE_SIZE, type IconRecord, type SearchResults, type StyleFilter } from "./shared.ts";

type Manifest = { icons: IconRecord[]; counts: SearchResults["counts"]; version: string };

/** The full index stays on the server. Each query returns only one bounded page. */
export function createIconSearch(manifest: Manifest) {
  const indexed = [...manifest.icons]
    .sort((a, b) => a.name.localeCompare(b.name) || a.style.localeCompare(b.style))
    .map(icon => ({
      icon,
      text: `${icon.name} ${icon.component} ${icon.name.replaceAll("-", " ")}`.toLowerCase(),
    }));
  return (query: string, style: StyleFilter, requestedPage = 1): SearchResults => {
    const normalized = query.trim().toLowerCase().slice(0, 120);
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const exact: IconRecord[] = [];
    const prefix: IconRecord[] = [];
    const partial: IconRecord[] = [];
    for (const { icon, text } of indexed) {
      if ((style !== "all" && icon.style !== style) || !tokens.every(token => text.includes(token))) continue;
      if (icon.name === normalized || icon.component.toLowerCase() === normalized) exact.push(icon);
      else if (icon.name.startsWith(normalized)) prefix.push(icon);
      else partial.push(icon);
    }
    // Stable rank buckets avoid sorting thousands of matches on every keystroke.
    const matches = [...exact, ...prefix, ...partial];
    const pages = Math.ceil(matches.length / PAGE_SIZE);
    const page = Math.max(1, Math.min(pages || 1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
    return {
      icons: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: matches.length, page, pages, counts: manifest.counts, version: manifest.version,
    };
  };
}
