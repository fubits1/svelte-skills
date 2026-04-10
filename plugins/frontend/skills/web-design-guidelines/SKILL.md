---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
argument-hint: <file-or-pattern>
user-invocable: true
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the rules from [command.md](command.md)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules
4. Output findings in the terse `file:line` format

## Usage

When a user provides a file or pattern argument:

1. Read [command.md](command.md) for the full ruleset
2. Read the specified files
3. Apply all rules
4. Output findings using the format specified in command.md

If no files specified, ask the user which files to review.
