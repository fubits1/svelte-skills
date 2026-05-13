import { statSync } from "node:fs";
import { glob } from "tinyglobby";

const GLOB_CHARS = /[*?[]/;
const SOURCE_EXTS_GLOB = "**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,svelte}";

// Windows cmd.exe limit is 8191 chars. The .cmd shims for npm bins (incl. oxlint.cmd,
// eslint.cmd) re-spawn through cmd.exe and inherit that limit. Stay safely below it
// per invocation.
const MAX_ARG_BYTES_PER_CALL = 6500;

export function chunkPaths(files: string[], commandPrefix: string): string[][] {
  const baseLen = commandPrefix.length;
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLen = baseLen;
  for (const file of files) {
    const addLen = file.length + 1;
    if (current.length > 0 && currentLen + addLen > MAX_ARG_BYTES_PER_CALL) {
      chunks.push(current);
      current = [];
      currentLen = baseLen;
    }
    current.push(file);
    currentLen += addLen;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

export function hasSvelte(files: string[]): boolean {
  return files.some((f) => normalizePath(f).endsWith(".svelte"));
}

// Default test-file globs. Override TEST_GLOBS env var as a comma-separated list to customise.
const DEFAULT_TEST_GLOBS = ["src/**/*.test.ts", "tests/**/*.test.ts"];

function testGlobs(): string[] {
  const env = process.env.TEST_GLOBS;
  if (!env) return DEFAULT_TEST_GLOBS;
  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function collectTestFiles(): Promise<string[]> {
  return await glob(testGlobs(), {
    ignore: ["**/node_modules/**", "**/__screenshots__/**"],
    dot: false,
    onlyFiles: true,
  });
}

function isDirectorySafe(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export async function expandGlobs(args: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const arg of args) {
    if (GLOB_CHARS.test(arg)) {
      const matches = await glob(normalizePath(arg), {
        onlyFiles: true,
        dot: false,
        absolute: true,
      });
      out.push(...matches);
    } else if (isDirectorySafe(arg)) {
      const matches = await glob(`${normalizePath(arg)}/${SOURCE_EXTS_GLOB}`, {
        ignore: ["**/node_modules/**", "**/__screenshots__/**"],
        onlyFiles: true,
        dot: false,
        absolute: true,
      });
      out.push(...matches);
    } else {
      out.push(arg);
    }
  }
  return out;
}
