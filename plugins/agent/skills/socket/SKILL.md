---
name: socket
description: Socket.dev security scanning — check packages before installing, scan repos for supply chain risks. Auto-invoke when evaluating package safety, checking dependencies, or before installing new packages.
user-invocable: true
argument-hint: <npm/package-name | scan>
---

# Socket

Use Socket to verify package safety before installing and to scan projects for supply chain risks.

## MCP tool (alternative)

The `socket-mcp` server is also available. Use its `depscore` tool for quick lookups when you only need the score without CLI output formatting.

## Check a package before installing

```bash
socket npm/<package-name> --markdown
```

- Always check BEFORE `pnpm add`.
- Supports: npm, pypi, nuget, gem, golang, maven.
- Pin a version: `socket npm/<package>@<version> --markdown`
- Use `--json` for raw data, `--markdown` for formatted output.

## Evaluate the result

Report these to the user:

1. **Self score** — the package itself (overall, vulnerability, license, supply chain, maintenance, quality)
2. **Transitive score** — worst scores across all dependencies
3. **Capabilities** — flags like `fs`, `net`, `shell`, `eval`, `unsafe` (benign in build tools, suspicious in utility libs)
4. **Alerts** — count and nature of alerts
5. **Dependency count** — high counts (200+) increase supply chain risk surface

Decision guidance:

- Vulnerability < 80 or supplyChain < 60 → warn the user
- Capabilities like `shell`, `eval`, `unsafe` on a non-build-tool → flag it
- Alert count > 5 → suggest `--json` for details

## Scan the current project

```bash
socket scan create --report
```

Creates a full scan of the project's dependencies and waits for the report.

- Use `--markdown` for formatted output.
- Use `--json` for CI-friendly output.
