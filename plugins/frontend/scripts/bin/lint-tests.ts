import { lintTests } from "../validate/lint-tests.ts";
const ok = await lintTests();
process.exit(ok ? 0 : 1);
