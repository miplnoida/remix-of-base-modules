/**
 * Phase 4B3 — PREVIEW_TIMESTAMP_DISPLAY_ALIGNED
 *
 * Single formatter for all Communication Hub evidence timestamps.
 * Never substitutes Date.now() for an absent server timestamp.
 * Always renders calendar date + time + timezone.
 */

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZoneName: "short",
};

export interface FormattedEvidenceTimestamp {
  ok: boolean;
  display: string;
  iso: string | null;
  utc: string | null;
  timezone: string;
}

export const UNAVAILABLE_LABEL = "Creation timestamp unavailable";

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatEvidenceTimestamp(
  iso: string | null | undefined,
  fallbackLabel = "—",
): FormattedEvidenceTimestamp {
  if (!iso || typeof iso !== "string") {
    return { ok: false, display: fallbackLabel, iso: null, utc: null, timezone: browserTimeZone() };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, display: fallbackLabel, iso, utc: null, timezone: browserTimeZone() };
  }
  return {
    ok: true,
    display: new Intl.DateTimeFormat(undefined, DATE_FMT).format(d),
    iso,
    utc: d.toISOString(),
    timezone: browserTimeZone(),
  };
}

export interface RemainingDuration {
  expired: boolean;
  totalSeconds: number;
  display: string;
}

export function computeRemaining(
  expiresAtIso: string | null | undefined,
  nowMs: number = Date.now(),
): RemainingDuration {
  if (!expiresAtIso) return { expired: true, totalSeconds: 0, display: "—" };
  const exp = new Date(expiresAtIso).getTime();
  if (Number.isNaN(exp)) return { expired: true, totalSeconds: 0, display: "—" };
  const diffSec = Math.floor((exp - nowMs) / 1000);
  if (diffSec <= 0) return { expired: true, totalSeconds: 0, display: "expired" };
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  return { expired: false, totalSeconds: diffSec, display: `${h}h ${m}m` };
}

export function formatTtl(
  createdAtIso: string | null | undefined,
  expiresAtIso: string | null | undefined,
): string {
  if (!createdAtIso || !expiresAtIso) return "—";
  const a = new Date(createdAtIso).getTime();
  const b = new Date(expiresAtIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return "—";
  const hours = Math.round((b - a) / 3_600_000);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}
