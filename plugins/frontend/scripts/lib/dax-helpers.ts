import { $ } from "dax";

export function logBanner(label: string): void {
  $.log(`── ${label} ──`);
}

export function logBannerEnd(): void {
  /* no-op — kept so callers don't need to branch */
}

export function logOk(label: string): void {
  $.logStep(`✓ ${label}`);
}

export function logFail(label: string): void {
  $.logError(`✗ ${label}`);
}

export function logSkip(label: string, reason: string): void {
  $.logLight(`~ ${label} (skipped — ${reason})`);
}
