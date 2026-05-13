const REGEX_META = /[\\.[\]*^$()+?{}|]/g;
const NEVER_MATCH = /(?!)/;
const LINE_SPLIT = /\r?\n/;

export function escapeRegex(input: string): string {
  return input.replace(REGEX_META, "\\$&");
}

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

type FilterOpts = { anchored?: boolean };

export function makePathFilter(files: string[], opts: FilterOpts = {}): RegExp {
  const anchored = opts.anchored !== false;
  if (files.length === 0) return NEVER_MATCH;
  const alt = files.map((f) => escapeRegex(normalize(f))).join("|");
  return new RegExp(`${anchored ? "^" : ""}(${alt})`);
}

export function filterLines(text: string, re: RegExp): string {
  return text
    .split(LINE_SPLIT)
    .filter((line) => re.test(line))
    .join("\n");
}
