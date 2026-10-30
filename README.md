# @nosweat/remix-tabler-icons

Raw [Tabler Icons](https://github.com/tabler/tabler-icons) SVGs converted to **native Remix 3.1 components**, not React components. Both outline and filled styles are included.

## Generate

Requires Bun 1.4.4 or newer.

```sh
bun install
bun run generate
```

The script resolves GitHub's latest stable Tabler release, downloads that tag's source archive, and reads `icons/outline/*.svg` and `icons/filled/*.svg` directly. It does not use Tabler's framework packages or transform React components.

To reproduce a particular release:

```sh
bun run generate --version v3.50.0
```

Optionally set `GITHUB_TOKEN` to increase GitHub API rate limits. The token is sent only to the GitHub API, not the archive host.

Output in `generated/` includes individual `.tsx` components, root and style-specific exports, the upstream MIT license, and a versioned icon manifest. Generated sources are gitignored; regenerate after cloning, then build before importing the package or type checking. Generation replaces the output only after every icon succeeds, removing stale icons from previous releases.

## Use

Configure your application's JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "remix/component"
  }
}
```

Install the package and its Remix peer dependency:

```sh
bun add @nosweat/remix-tabler-icons remix@^3.1.0
```

Import only the icons you use:

```tsx
import { IconHeart, IconHeartFilled } from "@nosweat/remix-tabler-icons";

export function Example() {
  return () => (
    <div>
      <IconHeart size={24} strokeWidth={1.5} title="Favorite" />
      <IconHeartFilled size={32} color="crimson" aria-label="Favorited" />
    </div>
  );
}
```

Style-specific and individual imports are also available:

```ts
import { IconHeart } from "@nosweat/remix-tabler-icons/outline";
import { IconHeartFilled } from "@nosweat/remix-tabler-icons/filled";
import { IconHeart as Heart } from "@nosweat/remix-tabler-icons/outline/IconHeart";
import type { IconProps } from "@nosweat/remix-tabler-icons";
```

Names use `Icon` + PascalCase SVG filename, with `Filled` appended for the filled style. For example, `arrow-left.svg` becomes `IconArrowLeft` or `IconArrowLeftFilled`.

Components use Remix's `Handle<IconProps>` and read current props inside the render closure. `size` defaults to 24; native `width` and `height` override it individually. Native SVG props, `class`, styles, ARIA attributes, and Remix `mix` behaviors pass through. Geometry and original SVG attribute spelling are preserved. Outline icons also support camelCase `strokeWidth`. Fill and stroke use the upstream defaults, normally `currentColor`.

Icons are decorative (`aria-hidden="true"`) by default. Supply `title`, `aria-label`, or `aria-labelledby` for an accessible name; `title` renders an escaped `<title>` and defaults the role to `img`. Explicit native props override defaults.

## Tree shaking and npm packaging

The published package is **ESM-only**, with one JavaScript module and one `.d.ts` declaration per icon. Root and style entry points contain static named re-exports, not an eagerly constructed icon registry. `sideEffects: false` lets bundlers discard unused modules, including when importing from the root barrel. Individual icon imports also avoid traversing the full barrel.

The Remix JSX runtime remains an external peer dependency; it is not bundled into every icon. Consumers do not need Bun or a TypeScript/JSX compiler to use the published JavaScript.

To prepare a release:

```sh
bun install
bun run generate                 # or --version v3.50.0 for a pinned upstream release
bun run build
bun run test:package
bun pm pack
```

`prepack` rebuilds the existing generated sources automatically, without downloading a different upstream release. Run `generate` explicitly to update the icon set. The npm tarball includes only `dist/`, this README, and package metadata. `dist/` contains compiled modules, declarations, the upstream license (`TABLER-LICENSE`), and the versioned manifest. CommonJS is not supported.

### First release: 0.1.0

The package is configured for public publication as `@nosweat/remix-tabler-icons@0.1.0` to the npm registry with the `latest` tag. With npm authentication configured and publish permission for the `@nosweat` scope:

```sh
bun run prepublishOnly
bun publish --dry-run
# When ready to release publicly:
bun publish --access public
```

`prepublishOnly` runs generator tests, package/tree-shaking checks, and type checking. `prepack` rebuilds the distribution. The dry run does not publish; the final command does. If npm requires two-factor authentication, follow its OTP instructions.

## Validate

```sh
bun test
bun run generate
bun run build
bun run test:package
bun check
```

Package checks bundle single-icon imports from the root, both style barrels, and individual subpaths, asserting that exactly one icon component remains. They also render the compiled JavaScript and inspect the npm tarball and declarations.

Generator tests cover raw SVG parsing, unsafe/malformed input rejection, both styles, exports, licensing, failed-generation recovery, and actual Remix 3.1 server rendering.

## Attribution

Tabler Icons are MIT licensed by their upstream authors. Each generation preserves their full license at `generated/LICENSE`, copied to `dist/TABLER-LICENSE` in the npm package. Include it when redistributing generated icons.
