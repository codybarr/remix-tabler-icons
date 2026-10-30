import { DOMParser, type Element, type Node } from "@xmldom/xmldom";

export type IconStyle = "outline" | "filled";

export function componentName(name: string, style: IconStyle): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error(`Invalid icon name: ${name}`);
  }
  return `Icon${name.split("-").map(part => part[0]!.toUpperCase() + part.slice(1)).join("")}${style === "filled" ? "Filled" : ""}`;
}

// Tabler icons contain geometry, never executable markup or external resources.
const tags = new Set(["svg", "g", "path", "circle", "ellipse", "line", "polyline", "polygon", "rect", "defs", "clipPath", "mask"]);

function attributes(element: Element): string {
  return Array.from(element.attributes).map(attr => {
    if (!/^[a-zA-Z][\w-]*$/.test(attr.name) || /^on/i.test(attr.name) || ["style", "innerHTML", "children", "mix", "ref"].includes(attr.name) || /url\s*\(/i.test(attr.value)) {
      throw new Error(`Unsupported SVG attribute: ${attr.name}`);
    }
    return `${attr.name}={${JSON.stringify(attr.value)}}`;
  }).join(" ");
}

function elementJSX(node: Node): string {
  if (node.nodeType === 8) return ""; // Metadata comments are not geometry.
  if (node.nodeType === 3 && !node.textContent?.trim()) return "";
  if (node.nodeType !== 1) throw new Error("Unexpected SVG content");
  const element = node as Element;
  if (!tags.has(element.tagName)) throw new Error(`Unsupported SVG element: ${element.tagName}`);
  const attrs = attributes(element);
  const children = Array.from(element.childNodes).map(elementJSX).join("");
  return children ? `<${element.tagName} ${attrs}>${children}</${element.tagName}>` : `<${element.tagName} ${attrs} />`;
}

export function convertSvg(svg: string, name: string, style: IconStyle): string {
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) throw new Error("SVG declarations are not supported");
  const document = new DOMParser({ onError: (level, message) => { throw new Error(`Invalid SVG (${level}): ${message}`); } }).parseFromString(svg, "image/svg+xml");
  const root = document.documentElement;
  if (!root || root.tagName !== "svg") throw new Error("Expected an SVG root");
  // Validate all attributes, including ones replaced by component conveniences.
  attributes(root);
  const hasStrokeWidth = root.hasAttribute("stroke-width");
  const defaults = Array.from(root.attributes)
    .filter(attr => !["width", "height", "class"].includes(attr.name))
    .map(attr => attr.name === "stroke-width"
      ? `stroke-width={strokeWidth ?? ${JSON.stringify(attr.value)}}`
      : `${attr.name}={${JSON.stringify(attr.value)}}`).join("\n        ");
  const geometry = Array.from(root.childNodes).map(elementJSX).filter(Boolean).join("\n        ");
  if (!geometry) throw new Error(`Empty SVG: ${name}`);
  const exportedName = componentName(name, style);
  return `// Generated from Tabler raw SVGs. Do not edit.\n/** @jsxImportSource remix/component */\nimport type { Handle, RemixElement } from "remix/component";\nimport type { IconProps } from "../../src/icon.ts";\n\nexport function ${exportedName}(handle: Handle<IconProps>): () => RemixElement {\n  return () => {\n    const { size = 24, title, ${hasStrokeWidth ? "strokeWidth, " : ""}...props } = handle.props;\n    return (\n      <svg\n        ${defaults}\n        width={size}\n        height={size}\n        class="icon icon-tabler icon-tabler-${style} icon-tabler-${name}"\n        aria-hidden={title || props["aria-label"] || props["aria-labelledby"] ? undefined : "true"}\n        role={title ? "img" : undefined}\n        {...props}\n      >\n        {title ? <title>{title}</title> : null}\n        ${geometry}\n      </svg>\n    );\n  };\n}\n`;
}
