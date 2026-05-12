---
name: dev-server
description: Dev server and background process management — when to start, mandatory cleanup, port safety. Auto-invoke when pnpm dev or any background process is involved.
user-invocable: true
---

# Dev Server

- NEVER start `pnpm dev` unless explicitly told to.
- ALWAYS assume user is running dev server already.
- NEVER kill user's server.
- ALWAYS check if AGENTS.md specifies port - if not either ASK or assume defaults (e.g. Vite: 5173)
- If started, kill IMMEDIATELY when done. Not later, not after the next step.
- Always clean up background processes immediately after verification.
- Never blindly kill processes on a port — ASK FIRST. It might be the user's process.
- After context compaction, assume you know NOTHING about what's currently running.
