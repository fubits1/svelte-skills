import { lintFile } from "../validate/lint-file.ts";
const ok = await lintFile(process.argv.slice(2));
process.exit(ok ? 0 : 1);
