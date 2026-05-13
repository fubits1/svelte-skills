import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { $ } from "dax";
import { lintFile } from "../validate/lint-file.ts";

// Lint files that are staged in git (and optionally committed-but-not-pushed).
//
// Usage:
//   node --experimental-strip-types scripts/bin/lint-staged.ts
//   node --experimental-strip-types scripts/bin/lint-staged.ts --committed
//
// `--committed` widens the scope to include commits ahead of upstream (or origin/main as
// fallback). Useful right before pushing a branch.

const SOURCE_EXTS = /\.(ts|js|svelte)$/i;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function gitOrEmpty(args: string[]): string {
  try {
    return git(args);
  } catch {
    return "";
  }
}

function splitFiles(out: string): string[] {
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const includeCommitted = process.argv.slice(2).includes("--committed");

const repoRoot = git(["rev-parse", "--show-toplevel"]);
const staged = splitFiles(
  git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]),
);

let committed: string[] = [];
if (includeCommitted) {
  let range = gitOrEmpty([
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{u}",
  ]);
  if (!range) {
    range = gitOrEmpty(["rev-parse", "--verify", "origin/main"])
      ? "origin/main"
      : "";
  }
  if (range) {
    committed = splitFiles(
      gitOrEmpty([
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        `${range}...HEAD`,
      ]),
    );
  } else {
    $.logWarn(
      "lint:staged --committed",
      "no upstream and no origin/main; skipping committed scan",
    );
  }
}

const candidates = [...new Set([...staged, ...committed])]
  .filter((f) => SOURCE_EXTS.test(f))
  .map((f) => resolve(repoRoot, f))
  .filter((abs) => {
    if (!existsSync(abs)) return false;
    const rel = relative(process.cwd(), abs);
    return rel !== "" && !rel.startsWith("..");
  })
  .map((abs) => relative(process.cwd(), abs).replaceAll("\\", "/"));

if (candidates.length === 0) {
  $.logLight("lint:staged — no staged source files in scope");
  process.exit(0);
}

const ok = await lintFile(candidates);
process.exit(ok ? 0 : 1);
