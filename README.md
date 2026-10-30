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

### Automated upstream releases

`.github/workflows/release.yml` checks the latest stable Tabler release every night at **03:23 UTC**, or manually via **Actions → Release updated Tabler icons → Run workflow**. Package versions match Tabler versions (for example, upstream `v3.50.0` publishes `3.50.0`). This intentionally moves automated releases from the initial `0.1.0` version to upstream versioning.

npm publishing uses **trusted publishing (OIDC)**, not an `NPM_TOKEN` secret. In the npm package's trusted publisher settings, select GitHub Actions, owner **`codybarr`**, repository **`remix-tabler-icons`**, and workflow filename **`release.yml`** (not the workflow's display name or full path). Leave the environment unset unless you also configure a matching GitHub environment on the release job. The workflow grants `id-token: write` and uses Node 24 with npm CLI 11 for publishing; installation, generation, tests, builds, and packing still use Bun. Public packages from public repositories receive npm provenance automatically; `package.json` declares the matching source repository. GitHub releases use the built-in `GITHUB_TOKEN` with `contents: write`. Repository policy must allow these permissions.

The workflow skips versions already on both npm and GitHub. Otherwise it generates the exact upstream tag, sets the package version in the build workspace, runs tests/package checks/type checking, and packs the release. It publishes to npm with the `latest` tag, then creates a matching GitHub release with `release.tgz` attached. Rerunning after a partial failure skips an already-published npm version and finishes the GitHub release. Network/authentication errors fail the check rather than being treated as missing releases.

No version bump or generated files are committed back to the default branch. The GitHub tag points to the source commit used for the build; its attached tarball contains the release-specific package version and upstream manifest. Changes within an already-released upstream tag do not trigger another release.

## Local documentation website

A native Remix 3.1 component application lives in `website/`. It imports UI icons directly from `generated/`, so no published package or React dependency is needed.

### Detached development with mise + Pitchfork

Install [mise](https://mise.jdx.dev/getting-started.html), then run from the repository root:

```sh
mise trust
mise install                     # pinned Bun 1.4.4 and Pitchfork 2.32.1
mise run start                   # installs dependencies, generates missing icons, starts detached
```

Open **http://127.0.0.1:4310** for install instructions, npm/pnpm/Bun tabs, and copyable examples. `/icons` provides name search, outline/filled filters, pagination, and an accessible preview dialog with component/import snippets. Light/dark mode follows the system initially and remembers an explicit choice.

The full searchable manifest stays on the server. Search is debounced and cancels obsolete requests; responses contain at most 72 records. Thumbnails load lazily from cached SVG endpoints rendered by the locally generated Remix components, rather than shipping thousands of icon modules to the browser. Search terms, style, and page are preserved in the URL.

`mise.toml` pins the tools and defines tasks; `pitchfork.toml` defines the `web` daemon. Pitchfork runs Bun with hot reload and waits for a successful HTTP readiness probe before startup returns. Its supervisor keeps the website alive after the command exits or the terminal closes. Starting an already running website is a no-op. There is no login/boot autostart configured.

| Operation | mise task | Bun script alias |
| --- | --- | --- |
| Start detached | `mise run start` | `bun run start` |
| Stop | `mise run stop` | `bun run stop` |
| Restart/apply config | `mise run restart` | `bun run restart` |
| Show PID/status/port | `mise run status` | `bun run status` |
| Follow logs | `mise run logs` | `bun run logs` |
| Run validation | `mise run check` | — |

Bun aliases require mise on `PATH`; they delegate to the same tasks. Stop targets only this project's `web` daemon, not other Pitchfork services. Ctrl-C while following logs stops the log viewer, **not** the website. For a finite log snapshot, use `mise exec -- pitchfork logs web -n 50 --no-pager`. Logs and process state are managed by Pitchfork outside this repository.

The managed daemon binds to loopback on port 4310. Pitchfork checks that the port is free instead of killing another process or silently switching ports. For a personal override, create the gitignored `pitchfork.local.toml`:

```toml
[daemons.web]
port = 4320
```

Then run `mise run restart`. The assigned port is passed to Bun as `PORT` and used by the readiness probe automatically. Managed ports are configured in Pitchfork, not by prefixing `PORT=...` to the start command. Local mise overrides belong in the gitignored `mise.local.toml`.

### Foreground alternatives

```sh
mise run dev                     # foreground hot reload, default port 3000
PORT=4320 mise run dev            # choose a foreground port
mise run serve                   # foreground production mode, no hot reload
```

After installing dependencies/generating icons, `bun run dev` and `bun run serve` also work directly. `HOST` and `PORT` configure foreground servers. `bun run start` now means **detached development**; the previous foreground production command is `bun run serve`.

The website and development configs are not included in the npm tarball.

## Deploy the website to Cloudflare Workers

The npm library build (`bun run build`) is separate from the website build. Workers cannot run the Bun development server directly.

In your Cloudflare Workers Git integration, use the repository root and set:

| Setting | Value |
| --- | --- |
| Build command | `bun run build:website` |
| Deploy command | `bunx wrangler deploy` |
| Preview/non-production deploy command (if enabled) | `bunx wrangler versions upload` |

The Worker name in `wrangler.jsonc` must match the Worker you connected in the dashboard; change `name` if yours differs from `remix-tabler-icons`. No secrets or additional bindings need to be configured in the dashboard.

The website build automatically runs icon generation on a clean checkout, bundles the frontend with Bun, and pre-renders SVGs into `dist-website/`. Wrangler uploads those static assets alongside a small search Worker. The icon manifest stays server-side; individual SVGs are served through the same `/api/icons/` URLs as local development. Unknown routes return 404, rather than an SPA fallback. The upstream license is included in the assets.

Generation defaults to the latest Tabler release. For a reproducible deployment, use `bun run generate --version v3.50.0 && bun run build:website` as the build command, substituting your desired release. If GitHub API rate limits affect unpinned generation, an optional `GITHUB_TOKEN` build secret increases the limit; it is not needed by the deployed Worker.

For local Workers testing or manual deployment:

```sh
bun run dev:worker                # build and start Wrangler's local Workers runtime
bun run deploy                    # build and deploy (requires Cloudflare authentication)
```

`bun run dev` and the mise/Pitchfork workflow still use Bun and are unchanged. Website assets and Wrangler state are gitignored and excluded from the npm package.

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
