import { delimiter, resolve } from "node:path";
import { $ } from "dax";
import { logSkip } from "../lib/dax-helpers.ts";
import { filterLines, makePathFilter } from "../lib/filter-output.ts";
import { runChunked, runParallel, type ParallelTask } from "../lib/grouped.ts";
import { expandGlobs, hasSvelte } from "../lib/paths.ts";

const BIN_DIR = resolve("node_modules/.bin");
if (!process.env.PATH?.includes(BIN_DIR)) {
  process.env.PATH = `${BIN_DIR}${delimiter}${process.env.PATH ?? ""}`;
}
if (!process.env.FORCE_COLOR) process.env.FORCE_COLOR = "1";

const ESLINT_EXTS = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs|svelte)$/i;
const OXLINT_EXTS = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i;
// tsgo cannot parse .svelte directly — those go through svelte-check instead.
const TS_EXTS = /\.(ts|tsx|mts|cts)$/i;

// Configurable defaults — override via env vars if your project uses different paths.
const TSCONFIG_PATH = process.env.TSCONFIG_PATH ?? "./tsconfig.json";
const SVELTE_CHECK_FLAGS = (
  process.env.SVELTE_CHECK_FLAGS ?? "--tsgo --threshold error"
).split(" ");

const someMatches = (files: string[], re: RegExp): boolean =>
  files.some((f) => re.test(f));

export async function lintFile(args: string[]): Promise<boolean> {
  if (args.length === 0) {
    $.logError("usage:", "lint-file <file-or-glob> [file2] ...");
    return false;
  }

  const files = await expandGlobs(args);
  if (files.length === 0) {
    $.logLight("no files matched");
    return true;
  }

  const filterAnchored = makePathFilter(files);
  const filterAny = makePathFilter(files, { anchored: false });
  let ok = true;

  // oxlint does not expand globs and does not walk arbitrary args the same way eslint does,
  // so feed it the resolved file list. Chunked to fit Windows cmd.exe limits.
  // `--no-error-on-unmatched-pattern` keeps oxlint from exiting 1 when every passed file
  // is filtered out by `.oxlintrc.json` ignorePatterns or `.gitignore`. "Nothing to lint"
  // is not a failure for a file-targeted command.
  if (someMatches(files, OXLINT_EXTS)) {
    const oxFiles = files.filter((f) => OXLINT_EXTS.test(f));
    const r = await runChunked("oxlint", "oxlint", oxFiles, [
      "--no-error-on-unmatched-pattern",
    ]);
    if (!r.ok) ok = false;
  } else {
    logSkip("oxlint", "no candidates in scope");
  }

  const tasks: ParallelTask[] = [];

  // Pass the resolved file list (filtered to extensions eslint can handle) — not the raw
  // args. Forwarding raw args lets non-source paths like `package.json` reach eslint, which
  // then warns "File ignored because no matching configuration was supplied" even though
  // the file is out of scope. Filtering up front keeps the eslint output clean.
  // `--no-warn-ignored` silences ESLint's "File ignored because of a matching ignore pattern"
  // warning for files covered by `.gitignore` or excluded in `eslint.config.js`.
  const eslintFiles = files.filter((f) => ESLINT_EXTS.test(f));
  if (eslintFiles.length > 0) {
    tasks.push({
      name: "eslint",
      cmd: $`eslint --no-warn-ignored ${eslintFiles}`,
    });
  } else {
    logSkip("eslint", "no candidates in scope");
  }

  // svelte-check runs `--tsgo --tsconfig ${TSCONFIG_PATH}`, which already type-checks every
  // .ts file in the project. Running tsgo separately would double-report the same errors
  // (and is a no-op for .svelte).
  const willRunSvelteCheck = hasSvelte(files);
  if (willRunSvelteCheck) {
    logSkip("tsgo", "covered by svelte-check --tsgo");
  } else if (someMatches(files, TS_EXTS)) {
    tasks.push({
      name: "tsgo",
      cmd: $`tsgo --noEmit`,
      filter: (out) => filterLines(out, filterAnchored),
      ok: (filtered) => filtered.length === 0,
    });
  } else {
    logSkip("tsgo", "no candidates in scope");
  }

  if (hasSvelte(files)) {
    tasks.push({
      name: "svelte-check",
      cmd: $`svelte-check --tsconfig ${TSCONFIG_PATH} ${SVELTE_CHECK_FLAGS}`,
      filter: (out) => filterLines(out, filterAny),
      ok: (filtered) => filtered.length === 0,
    });
  } else {
    logSkip("svelte-check", "no candidates in scope");
  }

  if (someMatches(files, ESLINT_EXTS)) {
    tasks.push({
      name: "knip",
      cmd: $`knip --exports --no-progress`,
      filter: (out) => filterLines(out, filterAny),
      ok: (filtered) => filtered.length === 0,
    });
  } else {
    logSkip("knip", "no candidates in scope");
  }

  const { ok: parallelOk } = await runParallel(tasks);
  if (!parallelOk) ok = false;

  if (ok) $.logStep("═══ ALL CHECKS PASSED ═══");
  else $.logError("═══ SOME CHECKS FAILED ═══");
  return ok;
}
