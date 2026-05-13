import { $ } from "dax";

// Configurable project name — override if your vitest storybook project uses a different name.
const PROJECT = process.env.VITEST_STORYBOOK_PROJECT ?? "storybook";

export async function testStory(pattern: string): Promise<number> {
  if (!pattern) {
    $.logError("usage:", "test-story <filePattern>");
    return 1;
  }
  return await $`pnpm exec vitest run --project ${PROJECT} --silent --reporter verbose ${pattern}`
    .noThrow()
    .code();
}
