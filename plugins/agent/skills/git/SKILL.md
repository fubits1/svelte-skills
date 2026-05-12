---
name: git
description: Git rules — safe operations, preventing destructive commands on user's working tree. Auto-invoke whenever using git commands.
user-invocable: true
---

# Git

- `git mv` for renames/moves. Never plain `mv`.
- Never `git stash` — moves user's uncommitted work without permission.
- Never `git checkout HEAD -- .` or `git restore .` — wipes ALL uncommitted changes. Selectively revert only files I touched.
- ALWAYS check `git status` before deleting any file. If a file is modified (staged or unstaged), it is active work and MUST NOT be deleted. When tests fail after a deletion, the deletion was the mistake — restore the deleted files. A drop in test count is a regression, not cleanup.
