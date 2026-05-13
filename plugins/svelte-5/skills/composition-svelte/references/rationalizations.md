# composition-svelte — rationalizations (counters)

Read this when: you catch yourself making one of the excuses below to skip a rule in SKILL.md or any reference file. Cross-reference the row's "Fix" column.

| Excuse | Reality | Fix |
| --- | --- | --- |
| "The wrapper needs to be reusable" | Reusability ≠ ignoring globals where the wrapper lives | If the global state value is in the app tree, read it. Drop the prop. |
| "The autofixer suggestion is just advisory" | Two `bind:this` advisories = architectural smell | `{@attach}` for element-augmenters; imperative mount for container-owners (`third-party.md`) |
| "I'll add the third-party constructor in `$effect` so it reacts to changes" | The dep is fixed for the wrapper's lifetime | `onMount` + cleanup return (`lifecycle.md`) |
| "I'll inline the markup into the Wrapper, it's only 3 lines" | The markup-only mount target is a distinct concern (separation of bridging logic from rendered markup) | Keep the markup-only `.svelte` file as a sibling in `<Feature>/`. See `third-party.md` "Markup-only discipline". |
| "I'll use `{@attach}` to bridge a third-party widget — modern Svelte way" | `{@attach}` is for element-augmenters; library-managed elements use imperative `mount()` | Read the existing pattern first (`third-party.md`) |
| "The bug only happens in one menu, the other menu is different" | Tabindex / focus / ESC patterns are shared | Grep for analogous; fix symmetrically |
| "I'll call this `attach<Feature>` because it sets things up" | "Attach" implies Svelte `{@attach}`; this uses an event-subscription API | `subscribe<Feature>` |
| "`el` is fine for an event arg" | `frontend:code-style` requires `element` | Rename |
| "I'll mount the wrapper imperatively from the controller so consumer only writes `<Feature />`" | Hides the wrapper + snippet relationship | Render declaratively in consumer template |
| "Default children for everything; named snippets are overkill" | Sometimes content has labeled regions; guessing wrong = breaking change later | Pick at design time per `decisions.md` |
| "I'll `:global(button)` in the wrapper to style the snippet buttons" | Cross-scope coupling code smell | `css-scope.md`: content owns its own styles, or use custom properties |
