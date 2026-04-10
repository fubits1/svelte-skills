import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type LintTask = {
  name: string;
  command: string;
  parse: (output: string) => string;
};

const SVELTE_CHECK_HUMAN =
  /svelte-check found (\d+ errors?) and (\d+ warnings?)/;
const SVELTE_CHECK_MACHINE = /COMPLETED \d+ FILES (\d+) ERRORS (\d+) WARNINGS/;
const ERRORS_RE = /(\d+) errors?/;
const WARNINGS_RE = /(\d+) warnings?/;
const KNIP_RE = /Unused|Unlisted|Unresolved/g;
// oxlint-disable-next-line no-control-regex -- intentional: stripping ANSI escape codes
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const OXLINT_SUMMARY_RE = /^Found \d+/;
const ESLINT_PROBLEMS_RE = /\d+ problems?/;
const stripAnsi = (s: string) => s.replace(ANSI_RE, "");

// Adapt: each task's `command` must match a script in your package.json
// e.g. "pnpm lint:knip" requires "lint:knip": "knip" in your scripts
const tasks: LintTask[] = [
  {
    name: "Knip",
    command: "pnpm lint:knip",
    parse: (out) => {
      const count = (out.match(KNIP_RE) || []).length;
      return count > 0 ? `${count} issues` : "";
    },
  },
  {
    name: "Svelte Check",
    command: "pnpm check",
    parse: (out) => {
      // human format: "svelte-check found 2193 errors and 11427 warnings in 362 files"
      const human = SVELTE_CHECK_HUMAN.exec(out);
      if (human) return `${human[1]}, ${human[2]}`;
      // machine format: "COMPLETED 444 FILES 2193 ERRORS 11427 WARNINGS"
      const machine = SVELTE_CHECK_MACHINE.exec(out);
      if (!machine) return "";
      const parts: string[] = [];
      if (machine[1] !== "0") parts.push(`${machine[1]} errors`);
      if (machine[2] !== "0") parts.push(`${machine[2]} warnings`);
      return parts.join(", ");
    },
  },
  {
    name: "Oxlint",
    command: "pnpm lint:oxlint",
    parse: (out) => {
      // summary line: "Found 0 warnings and 267 errors."
      const line = out.split("\n").find((l) => OXLINT_SUMMARY_RE.test(l));
      if (!line) return "";
      const errors = ERRORS_RE.exec(line);
      const warnings = WARNINGS_RE.exec(line);
      const parts: string[] = [];
      if (errors) parts.push(errors[0]);
      if (warnings) parts.push(warnings[0]);
      return parts.join(", ");
    },
  },
  {
    name: "ESLint",
    command: "pnpm lint:eslint",
    parse: (out) => {
      // summary line: "✖ 601 problems (599 errors, 2 warnings)"
      const line = out.split("\n").find((l) => ESLINT_PROBLEMS_RE.test(l));
      if (!line) return "";
      const errors = ERRORS_RE.exec(line);
      const warnings = WARNINGS_RE.exec(line);
      const parts: string[] = [];
      if (errors) parts.push(errors[0]);
      if (warnings) parts.push(warnings[0]);
      return parts.join(", ");
    },
  },
  {
    name: "Stylelint",
    command: "pnpm lint:styles",
    parse: (out) => {
      const line = out.split("\n").find((l) => l.includes("problems"));
      if (!line) return "";
      const errors = ERRORS_RE.exec(line);
      const warnings = WARNINGS_RE.exec(line);
      const parts: string[] = [];
      if (errors) parts.push(errors[0]);
      if (warnings) parts.push(warnings[0]);
      return parts.join(", ");
    },
  },
];

const results: Record<string, { Status: string; Detail: string }> = {};

for (const task of tasks) {
  // shell redirect to temp file ensures all output is captured
  const logFile = join(
    tmpdir(),
    `lint-${task.name.replace(/\s+/g, "-").toLowerCase()}.log`,
  );
  let passed = false;
  try {
    execSync(`${task.command} > "${logFile}" 2>&1`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    passed = true;
  } catch {
    // command failed — output is in the log file
  }
  let output = "";
  try {
    output = readFileSync(logFile, "utf-8");
  } catch {
    // log file not created
  }
  const detail = task.parse(stripAnsi(output));
  results[task.name] = {
    Status: passed ? "✅ Pass" : "⚠️  Fail",
    Detail: passed ? "" : detail,
  };
}

console.log("");
console.table(results);
