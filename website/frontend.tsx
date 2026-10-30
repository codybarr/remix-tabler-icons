import { createRoot, on, ref, type Handle } from "remix/component";
import { IconGridDots } from "../generated/outline/IconGridDots.tsx";
import { IconSun } from "../generated/outline/IconSun.tsx";
import { IconMoon } from "../generated/outline/IconMoon.tsx";
import { IconSearch } from "../generated/outline/IconSearch.tsx";
import { IconCopy } from "../generated/outline/IconCopy.tsx";
import { IconCheck } from "../generated/outline/IconCheck.tsx";
import { IconX } from "../generated/outline/IconX.tsx";
import { IconArrowRight } from "../generated/outline/IconArrowRight.tsx";
import { IconArrowLeft } from "../generated/outline/IconArrowLeft.tsx";
import { IconArrowUpRight } from "../generated/outline/IconArrowUpRight.tsx";
import { IconPackage } from "../generated/outline/IconPackage.tsx";
import { IconCode } from "../generated/outline/IconCode.tsx";
import { installCommands, iconExample, iconImport, packageName, type IconRecord, type SearchResults, type StyleFilter } from "./shared.ts";

function CopyButton(handle: Handle<{ text: string; label?: string }>) {
  let state: "idle" | "copied" | "error" = "idle";
  let timer: ReturnType<typeof setTimeout>;
  handle.signal.addEventListener("abort", () => clearTimeout(timer));
  return () => (
    <span class="copy-control">
      <button class="icon-button copy-button" type="button" aria-label={state === "copied" ? "Copied" : handle.props.label || "Copy code"} title={state === "copied" ? "Copied" : handle.props.label || "Copy code"}
        mix={on("click", async () => {
          try { await navigator.clipboard.writeText(handle.props.text); state = "copied"; }
          catch { state = "error"; }
          if (handle.signal.aborted) return;
          handle.update();
          clearTimeout(timer);
          timer = setTimeout(() => { state = "idle"; handle.update(); }, 2200);
        })}>
        {state === "copied" ? <IconCheck size={17} /> : <IconCopy size={17} />}
      </button>
      <span class={state === "error" ? "copy-error" : "sr-only"} role="status">{state === "copied" ? "Copied to clipboard" : state === "error" ? "Could not copy. Select the code manually." : ""}</span>
    </span>
  );
}

function Install(handle: Handle) {
  let manager: keyof typeof installCommands = "npm";
  const managers = Object.keys(installCommands) as (keyof typeof installCommands)[];
  function choose(next: typeof manager, focus = false) {
    manager = next;
    handle.update();
    if (focus) handle.queueTask(() => document.getElementById(`tab-${next}`)?.focus());
  }
  return () => (
    <section class="install-terminal" aria-label="Install package">
      <div class="terminal-toolbar">
        <div role="tablist" aria-label="Package manager" class="tabs">
          {managers.map(item => <button type="button" id={`tab-${item}`} role="tab" aria-selected={manager === item} aria-controls="install-command" tabIndex={manager === item ? 0 : -1}
            mix={[on("click", () => choose(item)), on("keydown", event => {
              const index = managers.indexOf(manager);
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault(); choose(managers[(index + (event.key === "ArrowRight" ? 1 : 2)) % 3]!, true);
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault(); choose(event.key === "Home" ? "npm" : "bun", true);
              }
            })]}>{item}</button>)}
        </div>
        <span class="terminal-label">terminal</span>
      </div>
      <div class="command-line" role="tabpanel" id="install-command" aria-labelledby={`tab-${manager}`} tabIndex={0}>
        <span class="prompt" aria-hidden="true">$</span><code>{installCommands[manager]}</code>
        <CopyButton text={installCommands[manager]} label="Copy install command" />
      </div>
    </section>
  );
}

function IconTile(handle: Handle<{ icon: IconRecord; select: (icon: IconRecord) => void }>) {
  return () => {
    const { icon, select } = handle.props;
    return <button type="button" class="icon-tile" aria-label={`Preview ${icon.name}, ${icon.style}`} title={`${icon.component} · ${icon.style}`} mix={on("click", () => select(icon))}>
      <span class="tile-art"><img class="icon-image" src={`/api/icons/${icon.component}`} width={28} height={28} loading="lazy" decoding="async" alt="" /></span>
      <span class="tile-name">{icon.name}</span>
      <span class={`style-mark ${icon.style}`} aria-hidden="true" />
    </button>;
  };
}

function IconModal(handle: Handle<{ icon: IconRecord; close: () => void }>) {
  let dialog: HTMLDialogElement;
  let tab: "component" | "import" = "component";
  let size = 96;
  const close = () => { dialog.close(); handle.props.close(); };
  return () => {
    const { icon } = handle.props;
    const code = tab === "component" ? iconExample(icon) : iconImport(icon);
    return <dialog class="icon-dialog" aria-labelledby="modal-title" mix={[
      ref(node => { dialog = node as HTMLDialogElement; dialog.showModal(); }),
      on("cancel", event => { event.preventDefault(); close(); }),
      on("click", event => { if (event.target === dialog) close(); }),
    ]}>
      <div class="dialog-content">
        <div class="dialog-heading"><div><span class="eyebrow">{icon.style} / 24 × 24</span><h2 id="modal-title">{icon.name}</h2></div>
          <button type="button" class="icon-button" aria-label="Close icon preview" title="Close" mix={on("click", close)}><IconX size={20} /></button>
        </div>
        <div class="large-preview"><img class="icon-image" src={`/api/icons/${icon.component}`} width={size} height={size} alt={`${icon.name} ${icon.style} icon`} /></div>
        <div class="preview-controls"><code>{icon.component}</code><div class="size-controls" role="group" aria-label="Preview size">{[24, 48, 96].map(value => <button type="button" aria-pressed={size === value} mix={on("click", () => { size = value; handle.update(); })}>{value}</button>)}</div></div>
        <div class="code-panel">
          <div class="code-toolbar"><div class="tabs" role="tablist" aria-label="Usage example">
            {(["component", "import"] as const).map(item => <button id={`example-tab-${item}`} type="button" role="tab" aria-selected={tab === item} aria-controls="example-code" tabIndex={tab === item ? 0 : -1}
              mix={[on("click", () => { tab = item; handle.update(); }), on("keydown", event => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  event.preventDefault(); tab = event.key === "Home" ? "component" : event.key === "End" ? "import" : tab === "component" ? "import" : "component";
                  handle.update(); handle.queueTask(() => document.getElementById(`example-tab-${tab}`)?.focus());
                }
              })]}>{item === "component" ? "Component" : "Import only"}</button>)}
          </div><CopyButton text={code} label="Copy usage example" /></div>
          <pre id="example-code" role="tabpanel" aria-labelledby={`example-tab-${tab}`} tabIndex={0}><code>{code}</code></pre>
        </div>
        <div class="dialog-foot"><span class="status-dot" />Native Remix 3.1 · tree-shakable import</div>
      </div>
    </dialog>;
  };
}

const previewIcons: IconRecord[] = [
  ["arrow-up-right", "IconArrowUpRight"], ["heart", "IconHeart"], ["bolt", "IconBolt"], ["command", "IconCommand"],
  ["cloud", "IconCloud"], ["folder", "IconFolder"], ["star", "IconStar"], ["sun", "IconSun"],
  ["mail", "IconMail"], ["bell", "IconBell"], ["leaf", "IconLeaf"], ["code", "IconCode"],
  ["camera", "IconCamera"], ["world", "IconWorld"], ["palette", "IconPalette"], ["circle-check", "IconCircleCheck"],
].map(([name, component]) => ({ name: name!, component: component!, style: "outline" }));

function App(handle: Handle) {
  const isSearch = location.pathname === "/icons";
  const initial = new URLSearchParams(location.search);
  let query = initial.get("q") || "";
  let style: StyleFilter = ["outline", "filled"].includes(initial.get("style") || "") ? initial.get("style") as StyleFilter : "all";
  let page = Math.max(1, Number(initial.get("page")) || 1);
  let results: SearchResults | undefined;
  let loading = isSearch;
  let error = "";
  let selected: IconRecord | undefined;
  let theme = document.documentElement.dataset.theme || "light";
  let timeout: ReturnType<typeof setTimeout>;
  let controller: AbortController | undefined;
  let requestId = 0;

  const select = (icon: IconRecord) => { selected = icon; handle.update(); };
  function updateURL() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (style !== "all") params.set("style", style);
    if (page > 1) params.set("page", String(page));
    history.replaceState(null, "", `/icons${params.size ? `?${params}` : ""}`);
  }
  async function load() {
    const current = ++requestId;
    controller?.abort();
    controller = new AbortController();
    loading = true; error = ""; handle.update();
    updateURL();
    try {
      const response = await fetch(`/api/search?${new URLSearchParams({ q: query, style, page: String(page) })}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Could not load icons. Please try again.");
      const data: SearchResults = await response.json();
      if (current !== requestId || handle.signal.aborted) return;
      results = data; page = data.page; updateURL();
    } catch (caught) {
      if (current !== requestId || handle.signal.aborted || (caught as Error).name === "AbortError") return;
      error = caught instanceof Error ? caught.message : "Could not load icons.";
    } finally {
      if (current === requestId && !handle.signal.aborted) { loading = false; handle.update(); }
    }
  }
  function changeSearch(nextQuery: string, nextStyle = style, immediate = false) {
    clearTimeout(timeout); controller?.abort(); requestId++;
    query = nextQuery; style = nextStyle; page = 1; loading = true;
    handle.update();
    if (immediate) void load(); else timeout = setTimeout(() => void load(), 150);
  }
  function changePage(nextPage: number) {
    clearTimeout(timeout); page = nextPage; void load();
    document.getElementById("explorer-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (isSearch) handle.queueTask(() => { void load(); });
  handle.signal.addEventListener("abort", () => { clearTimeout(timeout); controller?.abort(); });
  document.title = isSearch ? "Icon explorer — Tabler for Remix" : "Tabler for Remix — @nosweat";

  return () => <>
    <a href="#main" class="skip-link">Skip to content</a>
    <header class="site-header"><div class="header-inner">
      <a href="/" class="brand" aria-label="Tabler for Remix home"><span class="brand-symbol"><IconGridDots size={22} /></span><span>tabler<span class="brand-divider">/</span><strong>remix</strong></span></a>
      <nav aria-label="Main navigation"><a href="/" aria-current={!isSearch ? "page" : undefined}>Get started</a><a href="/icons" aria-current={isSearch ? "page" : undefined}>Icons</a></nav>
      <div class="header-actions"><span class="version">v0.1.0</span><button type="button" class="icon-button theme-button" title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} mix={on("click", () => {
        theme = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#141614" : "#f8f9f6");
        try { localStorage.setItem("tabler-theme", theme); } catch { /* Storage may be disabled. */ }
        handle.update();
      })}>{theme === "dark" ? <IconSun size={19} /> : <IconMoon size={19} />}</button></div>
    </div></header>
    <main id="main" class={isSearch ? "main-shell explorer" : "main-shell home"}>
      {isSearch ? <>
        <div class="page-heading" id="explorer-heading"><div><div class="eyebrow"><span class="status-dot" />THE COLLECTION</div><h1>Find your next icon.</h1><p>Every detail, in outline and filled.</p></div><span class="collection-count">{results ? (results.counts.outline + results.counts.filled).toLocaleString() : "—"}<small>icons, ready for Remix</small></span></div>
        <div class="search-toolbar">
          <div class="search-field"><IconSearch size={21} /><input type="search" name="q" value={query} maxLength={120} aria-label="Search icons" placeholder="Search icons by name…" autoComplete="off" spellcheck={false} mix={on("input", event => changeSearch((event.target as HTMLInputElement).value))} />{query && <button type="button" class="icon-button" title="Clear search" aria-label="Clear search" mix={on("click", () => changeSearch("", style, true))}><IconX size={17} /></button>}</div>
          <div class="segmented-control" role="group" aria-label="Icon style">{(["all", "outline", "filled"] as const).map(item => <button type="button" aria-pressed={style === item} mix={on("click", () => changeSearch(query, item, true))}>{item === "all" ? "All styles" : item === "outline" ? "Outline" : "Filled"}</button>)}</div>
        </div>
        <div class="results-bar"><span role="status" aria-live="polite">{loading ? "Finding icons…" : error ? "Search unavailable" : `${results?.total.toLocaleString() || 0} icons${query ? ` matching “${query}”` : ""}`}</span><span class="results-meta">{results?.version ? `Tabler ${results.version}` : "Tabler Icons"}</span></div>
        {error ? <div class="empty-state" role="alert"><IconSearch size={32} /><h2>That didn’t load.</h2><p>{error}</p><button class="button secondary" type="button" mix={on("click", () => void load())}>Try again</button></div>
          : !loading && !results?.icons.length ? <div class="empty-state"><IconSearch size={36} /><h2>No icons found.</h2><p>Try a shorter name or a different style.</p><button class="button secondary" type="button" mix={on("click", () => changeSearch("", "all", true))}>Reset search</button></div>
          : <div class={`icon-grid ${loading ? "is-loading" : ""}`} aria-label="Icon results" aria-busy={loading}>{results ? results.icons.map(icon => <IconTile key={icon.component} icon={icon} select={select} />) : Array.from({ length: 24 }, (_, i) => <div key={i} class="skeleton-tile" />)}</div>}
        {results && results.pages > 1 && !error && <nav class="pagination" aria-label="Results pages"><span>Page {results.page} of {results.pages}</span><div><button type="button" class="button secondary" disabled={loading || results.page <= 1} mix={on("click", () => changePage(page - 1))}><IconArrowLeft size={16} />Previous</button><button type="button" class="button secondary" disabled={loading || results.page >= results.pages} mix={on("click", () => changePage(page + 1))}>Next<IconArrowRight size={16} /></button></div></nav>}
      </> : <>
        <section class="intro"><div class="eyebrow"><span class="status-dot" />@NOSWEAT / REMIX-TABLER-ICONS</div><h1>Tabler icons.<br /><span>Native Remix.</span></h1><p class="intro-copy">A familiar collection. A native component.<br />Outline and filled icons, built for Remix 3.1.</p><div class="intro-actions"><a class="button primary" href="/icons">Explore the icons<IconArrowRight size={18} /></a><a class="text-link" href="https://www.npmjs.com/package/@nosweat/remix-tabler-icons" target="_blank" rel="noreferrer">View on npm<IconArrowUpRight size={16} /></a></div></section>
        <section class="install-section" aria-labelledby="install-heading"><div class="section-label"><span class="section-number">01</span><h2 id="install-heading">Make yourself at home.</h2><span class="muted mono">v0.1.0</span></div><Install /><div class="install-note"><IconPackage size={16} /><span>{packageName}</span><span class="note-divider">/</span><span>Remix 3.1+</span></div></section>
        <section class="usage-section" aria-labelledby="usage-heading"><div class="section-label"><span class="section-number">02</span><h2 id="usage-heading">One import. All yours.</h2></div><div class="usage-layout"><div class="code-panel home-code"><div class="code-toolbar"><span><IconCode size={16} /> example.tsx</span><CopyButton text={iconExample({ name: "heart", component: "IconHeart", style: "outline" })} label="Copy component example" /></div><pre><code>{iconExample({ name: "heart", component: "IconHeart", style: "outline" })}</code></pre></div><div class="usage-notes"><div><span class="note-index">ESM</span><h3>Only what you import.</h3><p>Static exports. No icon registry. Unused icons stay out of your bundle.</p></div><div><span class="note-index">JSX</span><h3>Remix, not React.</h3><p>Native render closures, current props, and your existing Remix runtime.</p></div><div><span class="note-index">24 × 24</span><h3>Small details. Any size.</h3><p>SVG geometry, currentColor, and native SVG props. Make them your own.</p></div></div></div><div class="config-note"><span class="eyebrow">JSX CONFIG</span><code>"jsxImportSource": "remix/component"</code><CopyButton text={'"jsxImportSource": "remix/component"'} label="Copy JSX configuration" /></div></section>
        <section class="preview-section" aria-labelledby="preview-heading"><div class="section-label"><span class="section-number">03</span><h2 id="preview-heading">A few familiar faces.</h2><a href="/icons" class="text-link">Browse all<IconArrowUpRight size={16} /></a></div><div class="icon-grid preview-grid">{previewIcons.map(icon => <IconTile key={icon.component} icon={icon} select={select} />)}</div></section>
      </>}
    </main>
    <footer class="site-footer"><div><a class="footer-brand" href="/">@nosweat<span>/</span>remix-tabler-icons</a><span>Built with the icons you’re looking at.</span></div><a href="https://tabler.io/icons" target="_blank" rel="noreferrer">Tabler Icons · MIT<IconArrowUpRight size={14} /></a></footer>
    {selected && <IconModal key={selected.component} icon={selected} close={() => { selected = undefined; handle.update(); }} />}
  </>;
}

createRoot(document.getElementById("app")!).render(<App />);
