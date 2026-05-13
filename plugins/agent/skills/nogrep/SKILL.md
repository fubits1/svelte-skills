---
name: nogrep
description: "Use fff MCP / Grep / Read / Glob — never Bash grep/cat/find/head/tail/sed/awk/rg/wc — for file search and read. Dedicated tools are auto-allowed; Bash equivalents need approval every time. Auto-invoke when searching, reading, or counting in files."
user-invocable: true
---

# Use Dedicated Tools, Not Bash

## Self-Check

Before every Bash call, ask: "Am I reading or searching file contents? Am I running a git command?" If reading/searching files — use fff first, the built-in tool second. If running git commands — route to `gh` / `! git` (exception: `git mv` stays in Bash). Period.

## Why

Every `Bash(grep ...)`, `Bash(cat ...)`, `Bash(find ...)` forces the user to click "Allow" in the IDE. Dedicated tools are auto-allowed — zero clicks. This is not a style preference. It directly wastes the user's time.

The `bonus` plugin ships a hook (`bonus/hooks/nogrep.sh`) that hard-blocks the wrong Bash calls. This skill is the educational mapping; the hook is the enforcement.

## Tool Preference Order

1. **[fff](https://fff.dmtrkovalenko.dev/) MCP** — first choice for any file search or content grep inside a git-indexed directory. Frecency-ranked results (frequent/recent files first, dirty files boosted), git-aware, constraint-aware. See README.md → "fff instead of grep/bash etc.".
2. **Built-in `Grep` / `Read` / `Glob`** — fallback when fff isn't installed or the search target lies outside the git tree.
3. **Bash** — only for the legitimate uses listed at the bottom of this skill.

## The Rule

**Never use Bash for reading or searching files.** Both fff and the built-in tools cover every case including multiline, context lines, counting, and pagination.

## Mapping Table

| Instead of this Bash           | First choice (fff MCP)                                      | Built-in fallback     |
| ------------------------------ | ----------------------------------------------------------- | --------------------- |
| `grep "pattern" file`          | `mcp__fff__grep` `query: "file pattern"`                    | **Grep** `pattern`, `path`, `output_mode: "content"` |
| `grep -r "pattern" dir`        | `mcp__fff__grep` `query: "dir/ pattern"`                    | **Grep** `pattern`, `path: "dir"` |
| `grep -rl "pattern"`           | `mcp__fff__grep` `output_mode: "files_with_matches"`        | **Grep** `output_mode: "files_with_matches"` |
| `grep -c "pattern"`            | `mcp__fff__grep` `output_mode: "count"`                     | **Grep** `output_mode: "count"` |
| `grep --include="*.ts"`        | `mcp__fff__grep` `query: "*.ts pattern"`                    | **Grep** `glob: "*.ts"` |
| `rg -U "multiline"`            | n/a (use built-in)                                          | **Grep** `multiline: true` |
| Multiple identifiers (OR)      | `mcp__fff__multi_grep` `patterns: [...]`                    | sequential Grep calls |
| `find . -name "*.ts"`          | `mcp__fff__find_files` `query: "name **/*.ts"`              | **Glob** `pattern: "**/*.ts"` |
| `find . -name "*test*"`        | `mcp__fff__find_files` `query: "test"`                      | **Glob** `pattern: "**/*test*"` |
| `cat file` / `cat -n file`     | n/a (use built-in)                                          | **Read** `file_path` |
| `head -100 file`               | n/a (use built-in)                                          | **Read** `limit: 100` |
| `tail -n +50 file \| head -30` | n/a (use built-in)                                          | **Read** `offset: 50`, `limit: 30` |
| `sed -n '50,80p' file`         | n/a (use built-in)                                          | **Read** `offset: 50`, `limit: 31` |
| `ls dir/` (listing)            | `mcp__fff__find_files` `query: "dir/"`                      | **Glob** `pattern: "dir/*"` |
| `wc -l file`                   | n/a (use built-in)                                          | **Grep** `pattern: "."`, `output_mode: "count"`, `path: "file"` |

## fff Core Rules

- **Search bare identifiers**, not code syntax or regex. `ActorAuth` (good); `struct ActorAuth` (bad — adding keywords narrows results and misses traits/enums).
- **Use constraints** to prefilter: `*.rs query`, `src/ query`, `name **/src/*.{ts,tsx} !test/`.
- **Stop after 2 greps — READ.** After 2 grep calls you have enough file paths. Read the top result. More greps ≠ better understanding.
- **`multi_grep`** for OR logic across naming conventions (`ActorAuth`, `actor_auth`, `populatedActorAuth`) — one call, not three.

See fff's own server instructions for the full constraint syntax.

## Multiline — Built-in Only

`mcp__fff__grep` matches within single lines. For cross-line patterns use the built-in `Grep` tool with `multiline: true` (equivalent to `rg -U --multiline-dotall`).

```
Grep(pattern: "struct \\{[\\s\\S]*?field", multiline: true, path: "src/")
```

There is NO reason to use `Bash(rg -U ...)`.

## Compound Built-in Calls

`grep -rl --include="*.ts" -A 5 -i "pattern" src/` becomes one Grep call:

```
Grep(pattern: "pattern", path: "src/", glob: "*.ts", -A: 5, -i: true, output_mode: "content")
```

No pipes. No chaining. No permission clicks.

## What Stays in Bash

These are legitimate Bash uses — either they have no dedicated tool equivalent, or they're narrow, read-only commands (like a simple `ls`) where Bash is fine. The blanket rule still applies for file search / read / mutation: use dedicated tools.

- **gh** (auto-allowed): `gh pr view`, `gh pr list`, `gh run view`, `gh api`, etc. Prefer `gh` over `git` for reading remote state — zero permission clicks.
- **pnpm/npm**: `pnpm install`, `pnpm build`, `pnpm test`, etc.
- **docker**: `docker exec`, `docker ps`, `docker compose`, etc.
- **build/dev tools**: `mvn`, `npx`, `pnpx`, etc.
- **Process management**: `lsof`, `kill`, `pkill`
- **File mutations**: `mkdir`, `cp`, `git mv`
- **Environment**: `which`, `node -e`, `java -version`
- **Simple `ls`** — Bash `ls` is permitted for narrow, read-only directory listing, but fff MCP (`mcp__fff__find_files`) is preferred for searching/reading files.

## git Commands

**NEVER use Bash for mutating git commands.** They are NOT auto-allowed and prompt the user every time. The `bonus` plugin's `nogrep.sh` hook also blocks them. Instead:

- For remote state (PRs, branches, CI): use `gh` (auto-allowed)
- For local git operations: use `!` prefix — suggest the user run `! git fetch`, `! git log`, etc. The output lands in the conversation.
- For `git mv`: this is a file mutation, use Bash (legitimate use)
