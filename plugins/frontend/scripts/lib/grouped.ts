import { $ } from "dax";
import { logBanner, logBannerEnd, logFail, logOk } from "./dax-helpers.ts";
import { chunkPaths } from "./paths.ts";

export type ParallelTask = {
  name: string;
  cmd: ReturnType<typeof $>;
  filter?: (output: string) => string;
  ok?: (filteredOutput: string, exitCode: number) => boolean;
};

type Captured = { combined: string; code: number };

/**
 * Run a single tool over a file list that may exceed Windows' cmd.exe 8191-char limit.
 * Splits the list into chunks that fit safely under the limit, spawns each chunk in
 * parallel via dax `$.all` (with auto tailDisplay), and concatenates results. Exit code
 * is the worst (highest) of the chunk exits.
 */
export async function runChunked(
  name: string,
  binary: string,
  files: string[],
  extraArgs: string[] = [],
): Promise<{ ok: boolean }> {
  if (files.length === 0) return { ok: true };
  // chunkPaths only needs an upper bound on the prefix length; include the joined
  // extra args so the budget stays accurate.
  const prefix = [binary, ...extraArgs].join(" ");
  const chunks = chunkPaths(files, `${prefix} `);
  const results = (await $.all(
    chunks.map((chunk) => {
      const cmd =
        extraArgs.length > 0
          ? $`${binary} ${extraArgs} ${chunk}`
          : $`${binary} ${chunk}`;
      return cmd.captureCombined().noThrow();
    }),
  )) as Captured[];
  const combined = results.map((r) => r.combined).join("");
  const code = results.reduce((max, r) => Math.max(max, r.code), 0);
  const ok = code === 0;
  logBanner(name);
  if (combined.length > 0) {
    const trailer = combined.endsWith("\n") ? "" : "\n";
    process.stdout.write(combined + trailer);
  }
  if (ok) logOk(name);
  else logFail(name);
  logBannerEnd();
  process.stdout.write("\n");
  return { ok };
}

function defaultOk(_filtered: string, code: number): boolean {
  return code === 0;
}

/**
 * Spawn every task's command in parallel via dax `$.all` (which automatically enables
 * `tailDisplay` so the user sees a live progress region at the bottom of the terminal
 * while they all run). After all settle, each task's captured output is printed
 * sequentially in declaration order. Each task may supply a filter (e.g. to narrow
 * tsgo output to specific files) and a custom `ok` predicate (e.g. svelte-check's
 * "non-zero only if filtered output non-empty").
 */
export async function runParallel(
  tasks: ParallelTask[],
): Promise<{ ok: boolean }> {
  if (tasks.length === 0) return { ok: true };

  const builders = tasks.map((t) => t.cmd.captureCombined().noThrow());
  const results = (await $.all(builders)) as Captured[];

  let ok = true;
  for (let i = 0; i < tasks.length; i += 1) {
    const task = tasks[i];
    const result = results[i];
    const output = task.filter ? task.filter(result.combined) : result.combined;
    const okFn = task.ok ?? defaultOk;
    const taskOk = okFn(output, result.code);

    logBanner(task.name);
    if (output.length > 0) {
      const trailer = output.endsWith("\n") ? "" : "\n";
      process.stdout.write(output + trailer);
    }
    if (taskOk) logOk(task.name);
    else {
      logFail(task.name);
      ok = false;
    }
    logBannerEnd();
    process.stdout.write("\n");
  }
  return { ok };
}
