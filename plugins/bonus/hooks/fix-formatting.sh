#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Run prettier on all supported files (skip .md/.mdx — Prettier pads markdown tables)
if [[ "$FILE_PATH" != *.md && "$FILE_PATH" != *.mdx ]]; then
  npx -y prettier --write "$FILE_PATH" >/dev/null 2>&1
fi

# Additionally run markdownlint on .md files
if [[ "$FILE_PATH" == *.md ]]; then
  npx -y markdownlint-cli2 --fix "$FILE_PATH" >/dev/null 2>&1
fi

exit 0
