---
name: comments
description: "Comment rules for every language: which comments survive, format, protected comments, placement, TODOs. Use when writing, editing, moving or deleting comments, docstrings or TODOs. Auto-invoke when editing code files."
user-invocable: true
---

# Comments

**REQUIRED SUB-SKILL:** `deslop`, from [stephenturner/skill-deslop](https://github.com/stephenturner/skill-deslop) (MIT). If it isn't installed, stop and ask the user to install it: `git clone https://github.com/stephenturner/skill-deslop.git ~/.claude/skills/deslop`. Where deslop and this skill disagree, this skill wins: deslop's "we" loses to the `we use` ban, for example.

Don't apply this skill from memory. It covers `//`, `/* */`, `/** */`, `#`, docstrings and `<!-- -->`.

## Which comments you judge

- **Your comments default to DELETE.** The survival test, Format and the ban-list judge only the comments you add in this task. A comment you add earns its place by the survival test, or it goes. The code already says WHAT, so a comment merely restating WHAT is noise.
- **A comment someone else requires skips the survival test** and takes the syntax and format they define. The ban-list still applies to the wording you choose, and any reason you give with it must pass the survival test. Required comments are:
  - a specific comment the user asks for
  - a docstring style the project's linter enforces
  - the `@component` block and prop JSDoc from `svelte-5:doc-component`
  - a tool directive such as `eslint-disable-next-line`; whether a directive is allowed at all is `frontend:editing`'s rule
- **Existing comments stay, with all their information.** A comment that was in the file before this task started is not yours to judge or reformat, even when it looks redundant. Never turn its `/** */` block into `//` lines. NEVER remove information from it, not with Write, not with Edit, not ever. Information means:
  - a `HINT`/`TODO`/`FIXME` keyword
  - a cross-reference
  - a non-obvious WHY
  - a marker such as `# v26.12.1`

  You may change it in three ways only:

  - fix the part your change made false
  - append (don't replace) a fact your change requires, in the comment's own style
  - delete it together with the code it describes

  This outranks default-DELETE. When in doubt, ask the user!
- **Don't move or merge comments.** Separately placed comments stay separate, and a rationale stays next to the code it explains.
- **Don't restore a comment the user deleted** (they told you, or it was already gone from the file when this task started).

## Survival test

A comment you add earns its place only if ALL hold:

1. **It teaches something the code cannot show**: a non-obvious invariant, a hidden constraint, a subtle race, a workaround for a specific external bug, a contract a future reader would otherwise violate.
2. **It still helps a reader fluent in the language.** A note narrating language mechanics a fluent reader already sees is noise; one explaining WHY unusual syntax exists is not.
3. **It will not become a lie within one refactor.** Anchor it to invariants, not to history: no commit hashes, spec, plan or step numbers, dates, or notes about removed code.
4. **It states only facts you checked** in the code, the docs or the task. No guessed causes or unconfirmed examples such as "(e.g. deleted server-side)".
5. **It reads clearly to someone who never saw this conversation.** No terms coined in the chat.
6. **It has no editorial filler** (see the ban-list).
7. **It is at the right scale** (see Format).
8. **It exists once.** Don't copy it into several files; put it where the constraint lives. A cross-reference names the file and symbol (`see close listener in popup.ts`), never a relative position.

A label passes rule 1 when it names what it heads or points to:

- a section anchor over a group of statements (`// request validation`)
- the title line of a `/** */` block (`close event listener`)
- a keyword (`HINT:`, `TODO:`, `FIXME:`); the text after it still has to pass
- a cross-reference: a file and symbol, or a link to an issue or doc that explains the WHY

## Format

- A fragment (a label or a phrase) starts with a lowercase letter and takes no trailing period: `// close event listener` not `// close event listener.`
- A full sentence, anything with a subject and a verb, starts with a capital letter and ends with a period: `// Svelte 5 unmount() is async; void satisfies no-floating-promises.`
- Identifiers, keywords and markers keep their case.
- No space between number and unit: `30s` not `30 s`.
- **Lengthy and important comments belong in `/** */` blocks**, not in stacked `//` lines: a non-obvious invariant, a multi-step rationale, a foot-gun warning. A block stands out, and IDEs render it on declarations. Use `//` for short single-line comments and inline notes. In Python, a function-level rationale goes in the docstring and a `#` comment stays one or two lines. In markup, use one `<!-- -->` block.

```typescript
// ❌ BAD: stacked // lines for a multi-line rationale
// Programmatic closes (showPopup, closePopup) reassign or clear
// activePopup before remove(), so the comparison fails for those
// and the listener returns. User-initiated closes still match.
popup.on('close', () => { ... })

// ✅ GOOD: lengthy/important rationale in a /** */ block
/**
 * close event listener
 *
 * Programmatic closes (showPopup, closePopup) reassign or clear
 * activePopup before remove(), so the comparison fails for those
 * and the listener returns. User-initiated closes still match.
 */
popup.on('close', () => { ... })

// ✅ GOOD: short single-line note stays inline
// Reassign before remove() so the close listener sees activePopup !== popup.
this.activePopup = popup
```

## Placement and TODOs

Put a comment directly above the construct it describes: function, method, branch or key statement. A TODO that calls for a code change includes the exact command or code, so whoever reads it knows what to do. Never write "see TODO above": if the reader has to search for context, the comment is useless. Each TODO is one block in one location with full context.

## Banned filler

No hedges, emphasis words or appeals to a process: `likely`, `probably`, `per plan`, `per spec`, `per locked decision`, `fire-and-forget`, `for safety`, `just in case`, `obviously`, `simply`, `basically`, `actually`, `of course`, `as you can see`, `note that`, `this is`, `we use`, their synonyms, and any restated function name, parameter list, or return value.

## Procedure

1. Write the code first.
2. Invoke `deslop` on the comments you added.
3. Judge each comment you added against the survival test and the ban-list; a required one only against the ban-list. Delete the failures in the same edit, one by one, not batched for later.
4. Don't rewrite a weak comment to be "less bad": needing a rewrite is the signal it fails rule 1, so delete it.
5. Diff the file: every existing comment is still there with all its information, and no orphan blank lines or dangling `*` markers remain.
6. In your report, write one line per comment you added, changed or deleted: `path:line KEEP <rule or required>`, `UPDATE fixed|appended`, or `DELETE <failed rule or code removed>`.

## Example

```typescript
// ❌ BAD: restates what void does
// fire-and-forget the unmount promise
void unmount(component);

// ❌ BAD: references removed code, becomes a lie on the next refactor
// no longer recomputes the radius on zoom

// ✅ GOOD: says WHY the unusual syntax exists
// Svelte 5 unmount() is async; void satisfies no-floating-promises.
void unmount(component);
```

## Rationalizations

| Excuse | Reality |
| --- | --- |
| "The user asked me to comment my changes" | A general request doesn't lift the survival test. Explain the rest in your reply. |
| "The spec number helps reviewers find the reasoning" | It's history. Write the WHY itself, or put the reference in the commit message. |
| "It's likely the cause" | "Likely" marks an unchecked guess, and an unchecked reason becomes a lie. Check it or leave it out. |
| "A longer comment is clearer" | Length isn't clarity. Cut to the one fact the code can't show. |
