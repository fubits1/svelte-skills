import { testStory } from "../validate/test-story.ts";
process.exit(await testStory(process.argv[2] ?? ""));
