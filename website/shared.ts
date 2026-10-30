export type IconStyle = "outline" | "filled";
export type StyleFilter = IconStyle | "all";
export type IconRecord = { name: string; component: string; style: IconStyle };
export type SearchResults = {
  icons: IconRecord[];
  total: number;
  page: number;
  pages: number;
  counts: { outline: number; filled: number };
  version: string;
};

export const PAGE_SIZE = 72;
export const packageName = "@nosweat/remix-tabler-icons";
export const installCommands = {
  npm: `npm install ${packageName} remix@^3.1.0`,
  pnpm: `pnpm add ${packageName} remix@^3.1.0`,
  bun: `bun add ${packageName} remix@^3.1.0`,
};

export function iconImport(icon: IconRecord) {
  return `import { ${icon.component} } from "${packageName}/${icon.style}/${icon.component}";`;
}

export function iconExample(icon: IconRecord) {
  return `${iconImport(icon)}\n\nexport function Example() {\n  return () => (\n    <${icon.component}\n      size={24}\n      color="currentColor"\n      title="${icon.name.replaceAll("-", " ")}"\n    />\n  );\n}`;
}
