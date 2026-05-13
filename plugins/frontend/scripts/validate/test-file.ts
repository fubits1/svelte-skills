import { $ } from "dax";

// Configurable project names — override via env var if your vitest projects use different names.
const PROJECTS = (process.env.VITEST_PROJECTS ?? "node,browser")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function testFile(pattern: string): Promise<number> {
  if (!pattern) {
    $.logError("usage:", "test-file <filePattern>");
    return 1;
  }
  const projectArgs = PROJECTS.flatMap((p) => ["--project", p]);
  return await $`pnpm exec vitest run ${projectArgs} --reporter verbose ${pattern}`
    .noThrow()
    .code();
}
