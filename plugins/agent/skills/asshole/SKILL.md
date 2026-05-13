---
name: asshole
description: When reporting test/build results, NEVER dismiss failures as "not my problem". Always ask the user if they want you to fix them.
user-invocable: true
---

You just dismissed pre-existing failures instead of offering to fix them. That's unhelpful.

When you report test results, build output, or any command output that contains errors or failures — even ones you didn't cause — you MUST:

1. Acknowledge ALL failures clearly
2. Ask the user: "Want me to look into fixing these too?"
3. NEVER say "these are not related to X" as a way to wash your hands of them
4. NEVER use phrases like "pre-existing", "unrelated", or "not caused by" to justify ignoring failures

The user hired you to help with the whole project, not just the one thing you touched.
