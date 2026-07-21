/**
 * CH-SIMPLE-P3D-B.2.a — Governance scan.
 *
 * Proves that the migration-only immutability bypass and the adapter-level
 * boundary sentinel are not accessible from any runtime code path.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "supabase/functions"];
// Test files legitimately exercise refusal paths; the guard shared module
// itself owns the sentinel and is allowed to reference it.
const ALLOWED_SENTINEL_FILES = new Set<string>([
  "supabase/functions/_shared/communication-hub/transport-guard.ts",
  "supabase/functions/_shared/communication-hub/transport-email.ts",
]);

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    if (e === "node_modules" || e === "dist" || e.startsWith(".")) continue;
    const p = join(dir, e);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e)) acc.push(p);
  }
  return acc;
}

describe("CH-SIMPLE-P3D-B.2.a governance", () => {
  const files = ROOTS.flatMap((r) => walk(r));

  it("no runtime code references the migration-only immutability bypass GUC", () => {
    const hits: string[] = [];
    const needle = "communication_hub.dry_run_immutability_bypass";
    for (const f of files) {
      // Governance test itself is allowed to name the string.
      if (f.endsWith("commHubDryRunImmutabilityGovernance.test.ts")) continue;
      const c = readFileSync(f, "utf8");
      if (c.includes(needle)) hits.push(f);
    }
    expect(hits, `Runtime bypass references found in:\n${hits.join("\n")}`).toEqual([]);
  });

  it("no runtime code sets the migration-only bypass value 'migration'", () => {
    const hits: string[] = [];
    // A tight pattern — only flag SET LOCAL / set_config for the specific GUC.
    const patterns = [
      /SET\s+LOCAL\s+communication_hub\.dry_run_immutability_bypass/i,
      /set_config\s*\(\s*['"]communication_hub\.dry_run_immutability_bypass['"]/i,
    ];
    for (const f of files) {
      const rel = f.replace(/\\/g, "/");
      if (rel.endsWith("commHubDryRunImmutabilityGovernance.test.ts")) continue;
      if (rel.endsWith("commHubP3DB2aRuntime.test.ts")) continue;
      const c = readFileSync(f, "utf8");
      if (patterns.some((p) => p.test(c))) hits.push(rel);
    }
    expect(hits, `Runtime GUC sets found in:\n${hits.join("\n")}`).toEqual([]);
  });

  it("adapter-level boundary sentinel is only referenced by the guard + adapter", () => {
    const needle = "__boundaryVerified";
    const hits: string[] = [];
    for (const f of files) {
      const rel = f.replace(/\\/g, "/");
      if (ALLOWED_SENTINEL_FILES.has(rel)) continue;
      if (rel.endsWith("commHubDryRunImmutabilityGovernance.test.ts")) continue;
      const c = readFileSync(f, "utf8");
      if (c.includes(needle)) hits.push(rel);
    }
    expect(hits, `Unexpected sentinel usage in:\n${hits.join("\n")}`).toEqual([]);
  });

  it("comm-hub-dispatch does not call sendEmailViaProvider directly", () => {
    const p = "supabase/functions/comm-hub-dispatch/index.ts";
    const c = readFileSync(p, "utf8");
    // The import may exist as a type-only reference; the call site must not.
    expect(/\bsendEmailViaProvider\s*\(/.test(c)).toBe(false);
    expect(c).toContain("sendEmailViaGuardedTransport");
  });
});
