---
name: research
description: >-
  Research discipline — how to investigate before acting,
  verify claims. Auto-invoke when researching, answering
  questions, or planning migrations.
user-invocable: true
---

# Research

- **When the user says "research"**: DO NOT write, edit,
  or create ANY files until research is complete. Only
  after you have the answer may you act on it.
- **"Research" means investigate, not reformulate what you
  already think you know.** Use tools to find the real
  answer. Your assumptions are wrong until proven otherwise.

## Mandatory Research Channels

When `/research` is invoked, you MUST hit ALL four
channels before writing anything. Skipping a channel is
not research — it's guessing.

### 1. Local investigation

Grep the codebase, read configs, check what's already in
place. Look at existing skills, hooks, settings,
package.json scripts, CLAUDE.md files. The answer may
already be in the project.

### 2. Docs and MCPs

Use available MCP servers (Svelte, Storybook, knip, etc.).
Fetch `llms.txt` for libraries. Read official
documentation via WebFetch. The authoritative source beats
a blog post.

### 3. Online research

WebSearch for ALL of these — not just the first one that
returns results:

- **GitHub issues and PRs** — the problem may be known
  and tracked, with existing solutions or workarounds in
  the comments
- **Official docs and changelogs** — features you don't
  know about, recent additions, migration guides
- **Blog posts and tutorials** — how others solved the
  same problem
- **StackOverflow** — common pitfalls, edge cases,
  validated answers
- **Existing solutions** — skills, plugins, hooks,
  packages, configs that others have built and shared

### 4. Verify and synthesize

Cross-reference findings. Check if GitHub issues are still
open or already closed. Check if suggested solutions
actually work in the current version. Don't present the
first search result as the final answer.

## Evidence Requirement

Before presenting findings, you must have used at minimum:

- At least one **Grep or Read** (local investigation)
- At least one **WebSearch or WebFetch** (online research)

If you haven't used both, you haven't researched. Go back
and do it.

## "THOROUGHLY" = exhaustive first pass

Data-flow / trace request. Cover every hop in one pass.
Re-prompt for forgotten layer = fail.

Layers to check before writing:

1. Component tree: child → every parent, every render site
2. Contexts + global stores: producers, consumers
3. Outgoing props, `bind:*`, events
4. TS DTOs / API call shape
5. HTTP endpoint: path vs query vs body — which layer
   carries what
6. Backend DTOs (Java/Kotlin/Python). Field-by-field vs
   TS. Mark fields TS does not send.
7. Backend handler/controller/service touching the data
8. Incoming sources feeding the components: autocomplete
   fetch, subscriptions, websockets, polling, stores
   seeded elsewhere

Mermaid graph includes every layer. N/A → say so.

## The "Research From Memory" Anti-Pattern

The failure mode that keeps happening: reading this skill,
saying "let me research this", then writing an answer from
existing knowledge without using a single search tool.

A common shape: asked to research a tool problem and
"suggest better approaches", an answer gets written from
memory — missing that the problem is a known tracked bug
with existing community solutions far better than what gets
produced from vibes.

**If you catch yourself about to write an answer without
having used WebSearch or WebFetch, STOP. You are doing the
thing. Go search.**

## Specific Rules

- Use `npmx.dev` for package info, not npmjs.com.
- Verify packages with
  `socket package score npm <pkg>@<ver> --markdown`
  before use.
- actionlint (npm): WASM library, no CLI.
  node-actionlint: has CLI. Use
  `pnpx node-actionlint` to validate GitHub Actions
  workflows.
- Read docs FIRST before hacking configs.
- Research tool capabilities THOROUGHLY before planning
  migrations.
- Verify claims by running tools. Never answer yes/no
  from vibes.
- Never claim something is a "known bug" or "pre-existing"
  without proof.
- Never claim something isn't installed without verifying.
  Consider wrong package name, wrong flags, wrong depth.
- CI analysis: check the exact commit SHA that triggered
  the run. Don't carry stale assumptions.
- When the user reports a UI bug with specific interaction
  steps: trace the EXACT code path of those steps. Don't
  investigate broadly — follow the user's reproduction
  steps through the code.
- **"ARE YOU SURE?" from the user IS a research request.**
  Invoke this skill immediately. Re-reading your own diff
  or code is NOT research.

## The Bullshit Gate

Before answering ANY factual question about a tool, CLI
flag, API, library behavior, or compatibility — ask:

**"Did I verify this, or am I about to guess?"**

If the answer is "guess", STOP. Do one of:

1. Say "I don't know" — this is always acceptable
2. Run the tool/command to check — this takes seconds
3. Use WebSearch/WebFetch to look it up — this takes seconds

**Red flags that you're about to bullshit:**

| Thought                          | Reality                               |
| -------------------------------- | ------------------------------------- |
| "I'm pretty sure the flag is..." | You're guessing                       |
| "This should work because..."    | You haven't tested it                 |
| "The alternative is X"           | Have you verified X works?            |
| "It's a known bug"               | Do you have a link? Is it still open? |

**Common bullshit patterns to recognize:**

- Inventing flag values or argument semantics (e.g.
  describing what `--pre 1` does — when the flag does not
  accept that)
- Misdescribing tool output (e.g. wrong claim about what
  `eslint --stats` reports)
- Claiming version incompatibility that doesn't exist
  (e.g. "X can't use Y yet" — when it has been working in
  the project for weeks)
- Citing a closed GitHub issue as an unresolved blocker
- Claiming a review finding was fixed when it wasn't

The pattern is always the same: confident delivery of
unverified claims. The fix is always the same: verify
BEFORE speaking, or say "I don't know."
