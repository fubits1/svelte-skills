import { testFile } from "../validate/test-file.ts";
process.exit(await testFile(process.argv[2] ?? ""));
