import { latestVersion } from "./generate.ts";

/** Only an explicit 404 means absent; auth, rate-limit and server errors must fail the run. */
export async function exists(url: string, headers: Record<string, string> = {}): Promise<boolean> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Release check failed (${response.status}): ${url}`);
  return true;
}

export function packageVersion(tag: string): string {
  if (!/^v\d+\.\d+\.\d+$/.test(tag) || tag !== tag.trim()) throw new Error(`Unexpected Tabler release tag: ${tag}`);
  return tag.slice(1);
}

if (import.meta.main) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const output = process.env.GITHUB_OUTPUT;
  if (!repository || !token || !output) throw new Error("Run this script inside GitHub Actions");

  const tag = await latestVersion();
  const version = packageVersion(tag);
  const pkg = await Bun.file("package.json").json();
  const [npmPublished, githubReleased] = await Promise.all([
    exists(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${version}`),
    exists(`https://api.github.com/repos/${repository}/releases/tags/${tag}`, {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "remix-tabler-icons",
    }),
  ]);

  const file = Bun.file(output);
  await Bun.write(file, (await file.text()) + [
    `tag=${tag}`,
    `version=${version}`,
    `npm_published=${npmPublished}`,
    `github_released=${githubReleased}`,
    `needed=${!npmPublished || !githubReleased}`,
    "",
  ].join("\n"));
  console.log(`Tabler ${tag}: npm=${npmPublished}, GitHub=${githubReleased}`);
}
