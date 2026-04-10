---
name: playwright
description: Playwright MCP usage rules — screenshots, code sandbox, Chrome data. Auto-invoke when using Playwright MCP tools.
user-invocable: true
---

# Playwright MCP

- **Ad-hoc screenshots (browser_take_screenshot): ALWAYS use `filename` with `/tmp/` path. NEVER relative paths. NEVER save to the project directory.** Every ad-hoc screenshot filename MUST start with `/tmp/`. Example: `/tmp/tabs-before.png`. Saving screenshots without `/tmp/` prefix pollutes the project with untracked files. This applies to screenshots YOU take for debugging/verification — NOT to automated test screenshots, which follow their own conventions (e.g. `tests/**/screenshots/`).
- **ALWAYS verify changes in the browser using Playwright MCP.** Navigate to the affected URL(s), take a screenshot, and visually confirm the page works. A DOM snapshot alone proves NOTHING — it cannot show canvas/WebGL/SVG rendering, layout, or visual state. ALWAYS take a screenshot. If you cannot visually confirm it works from the screenshot (e.g. WebGL canvas blank in headless), say so honestly — do NOT claim it's fixed.
- **ALWAYS Automate Playwright** if you need to verify the same thing more than once.
- **ALWAYS Automate Playwright** if you need to run a sequence of actions to verify.
- `run_code` sandbox: use `page.waitForTimeout(ms)`, never `setTimeout`.
- NEVER delete Chrome user data dir (`mcp-chrome-*`). It has auth cookies.
- If Playwright can't launch because Chrome is already running, kill the existing Chrome process yourself — don't ask the user.
- **CSS/layout changes: ALWAYS take before/after screenshots.** Screenshot BEFORE making changes to establish a baseline, then screenshot AFTER to compare. This catches regressions instantly.
- **CSS/layout screenshots require CRITICAL EXAMINATION.** Before taking the screenshot, write the specific visual criteria that must be true (e.g. "rows must be offset", "gap must be uniform"). After taking the screenshot, check EACH criterion individually and state pass/fail for each. Do NOT glance at the screenshot and say "looks good." If any criterion fails, STOP — do not proceed. When in doubt, take MORE screenshots at different widths — do NOT ask the user to verify for you.
- **When a visual bug is reported, INVESTIGATE before guessing fixes.** Use `browser_evaluate` to measure actual element positions, sizes, and computed styles. Compare measured values against expected values. A 5-minute investigation with JS measurements beats hours of blind CSS tweaking. NEVER change formulas or constants without first understanding WHY the current values produce wrong results.
- **Use `browser_evaluate` to MEASURE, not just screenshot.** When debugging layout issues, use JS to read actual `getBoundingClientRect()` positions, `getComputedStyle()` values, `scrollHeight`, `clientWidth` etc. Comparing measured numbers reveals the root cause instantly — screenshots only show symptoms. This is the difference between 5 minutes of investigation and hours of blind guessing.
- **PIXEL DRIFT DETECTION**: When making CSS or HTML element changes, invoke `frontend:pixel-perfect`. It has the mandatory measurement workflow: measure BEFORE with `browser_evaluate`, apply change, measure AFTER, report a diff table. Screenshots supplement measurements — they are NOT the comparison. The numbers from `getBoundingClientRect()` and `getComputedStyle()` ARE the comparison. Never claim "looks the same" from eyeballing screenshots.
- **ALWAYS CHECK CONSOLE ERRORS.** After EVERY navigation and EVERY interaction (click, select, submit), check for console errors. Use `browser_evaluate` to read errors or check the console log file from the navigation event. A page that renders but throws console errors is NOT working. Console errors are bugs until proven otherwise.
