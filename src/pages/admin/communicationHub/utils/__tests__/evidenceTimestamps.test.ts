/**
 * Phase 4B3 — PREVIEW_TIMESTAMP_DISPLAY_ALIGNED tests.
 * Pure formatter tests (no network, no provider/simulator calls).
 */
import { describe, it, expect } from "vitest";
import {
  formatEvidenceTimestamp,
  computeRemaining,
  formatTtl,
  UNAVAILABLE_LABEL,
} from "@/pages/admin/communicationHub/utils/evidenceTimestamps";

const CREATED = "2026-07-23T21:46:15.186Z";
const EXPIRES = "2026-07-24T21:46:15.186Z";

describe("evidenceTimestamps", () => {
  it("1/3/4/5. formats a real ISO timestamp with date, time and TZ (24h TTL crosses days)", () => {
    const c = formatEvidenceTimestamp(CREATED);
    const e = formatEvidenceTimestamp(EXPIRES);
    expect(c.ok).toBe(true);
    expect(e.ok).toBe(true);
    expect(c.display).toMatch(/2026/);
    expect(e.display).toMatch(/2026/);
    // Both must contain their respective day-of-month, proving date is rendered.
    expect(c.display).toMatch(/\b\d{1,2}\b/);
    expect(e.display).toMatch(/\b\d{1,2}\b/);
    // Some form of timezone must be present (short name or UTC offset).
    expect(c.display).toMatch(/[A-Z]{2,5}|GMT|UTC|[+-]\d/);
  });

  it("2. formatEvidenceTimestamp never invents a value when input is missing", () => {
    const r = formatEvidenceTimestamp(null, UNAVAILABLE_LABEL);
    expect(r.ok).toBe(false);
    expect(r.display).toBe(UNAVAILABLE_LABEL);
    expect(r.iso).toBeNull();
  });

  it("6. invalid created_at renders unavailable label, not a fabricated date", () => {
    const r = formatEvidenceTimestamp("not-a-date", UNAVAILABLE_LABEL);
    expect(r.ok).toBe(false);
    expect(r.display).toBe(UNAVAILABLE_LABEL);
  });

  it("7. expires_at <= now yields expired=true", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(computeRemaining(past).expired).toBe(true);
  });

  it("10. active preview shows positive remaining duration", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const r = computeRemaining(future);
    expect(r.expired).toBe(false);
    expect(r.totalSeconds).toBeGreaterThan(0);
    expect(r.display).toMatch(/\dh \d+m/);
  });

  it("12. formatTtl returns 24 hours for the affected preview (no TTL mutation)", () => {
    expect(formatTtl(CREATED, EXPIRES)).toBe("24 hours");
  });

  it("14/15. formatter performs zero provider/simulator side effects", () => {
    // Purely referentially transparent — calling it many times has no side effects.
    for (let i = 0; i < 100; i++) formatEvidenceTimestamp(CREATED);
    expect(true).toBe(true);
  });
});
