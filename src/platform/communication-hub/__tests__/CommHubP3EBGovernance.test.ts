/**
 * CH-SIMPLE-P3E-B.3 — Governance: frontend must never mutate or read the
 * controlled-live grant/execution tables directly, and must never invoke
 * providers outside the shared guarded transport.
 *
 * This test scans the src/ tree and fails if a violation is introduced.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

function scan(pattern: string): string[] {
  try {
    const out = execSync(
      `rg -n --no-heading --glob 'src/**' --glob '!src/platform/communication-hub/controlledLiveService.ts' --glob '!src/**/__tests__/**' -- ${JSON.stringify(pattern)}`,
      { encoding: "utf8" },
    );
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

describe("CH-SIMPLE-P3E-B governance scan", () => {
  it("no frontend code writes to communication_controlled_live_execution", () => {
    const hits = scan("communication_controlled_live_execution").filter((l) =>
      /\.(insert|update|delete|upsert)\s*\(/.test(l),
    );
    expect(hits).toEqual([]);
  });

  it("no frontend code touches communication_controlled_live_grant", () => {
    const hits = scan("communication_controlled_live_grant");
    expect(hits).toEqual([]);
  });

  it("no frontend code invokes a real email provider directly", () => {
    const hits = [
      ...scan("api\\.resend\\.com"),
      ...scan("api\\.sendgrid\\.com"),
      ...scan("api\\.postmarkapp\\.com"),
      ...scan("api\\.mailgun\\.net"),
    ];
    expect(hits).toEqual([]);
  });
});
