import type { Props } from "remix/component";

/** Native Remix SVG props, plus Tabler's sizing convenience. */
export type IconProps = Omit<Props<"svg">, "children" | "innerHTML" | "size"> & {
  size?: number | string;
  title?: string;
};
