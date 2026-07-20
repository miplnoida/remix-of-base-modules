/**
 * CH-SIMPLE-P3B-R.1 — Repository duplication scan.
 *
 * Fails the build if Communication Hub production code re-introduces an
 * independent authorisation path. Only the canonical evaluator
 * (`public.evaluate_comm_hub_send_decision`) and its compat wrappers are
 * permitted to decide recipient eligibility.
 *
 * Documented exemptions:
 *   - tests, __tests__, .test., .spec.
 *   - src/integrations/supabase/types.ts (auto-generated)
 *   - src/platform/communication-hub/recipientPolicyService.ts (canonical settings CRUD)
 *   - src/pages/admin/communicationHub/recipientControl/** (canonical settings UI)
 *   - supabase/migrations/** (schema history)
 *   - display-only diagnostic surfaces documented in the master report
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../../..");

const EXEMPT = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)build(\/|$)/,
  /(^|\/)coverage(\/|$)/,
  /(^|\/)__tests__(\/|$)/,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /(^|\/)src\/test\//,
  /(^|\/)e2e\//,
  /(^|\/)docs\//,
  /src\/integrations\/supabase\/types\.ts$/,
  /src\/platform\/communication-hub\/recipientPolicyService\.ts$/,
  /src\/pages\/admin\/communicationHub\/recipientControl\//,
  /supabase\/migrations\//,
  /scripts\/comm-hub\//,
];

// Independent-authorisation smells inside Communication Hub production code.
// Each entry is [pattern, description].
const FORBIDDEN: Array<[RegExp, string]> = [
  [/isRecipientAllowedByLists\s*\(/, "independent recipient-allowlist decision"],
  [/COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST\s*[^;]{0,120}(includes|has|test|match)\b/,
   "env allowlist used as an authoriser"],
];

function isExempt(rel: string): boolean {
  return EXEMPT.some((r) => r.test(rel));
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = path.relative(ROOT, abs);
    if (isExempt(rel)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(abs, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) acc.push(abs);
  }
  return acc;
}

describe("CH-SIMPLE-P3B-R.1 duplication scan", () => {
  it("no Communication Hub production file re-introduces independent authorisation", () => {
    const roots = [
      path.join(ROOT, "src", "platform", "communication-hub"),
      path.join(ROOT, "src", "pages", "admin", "communicationHub"),
      path.join(ROOT, "supabase", "functions"),
    ].filter((p) => fs.existsSync(p));

    const files = roots.flatMap((r) => walk(r));
    const hits: Array<{ file: string; pattern: string; line: string }> = [];

    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const src = fs.readFileSync(file, "utf8");
      const lines = src.split(/\r?\n/);
      for (const [pattern, description] of FORBIDDEN) {
        lines.forEach((line, i) => {
          if (pattern.test(line)) {
            hits.push({ file: rel, pattern: description, line: `${i + 1}: ${line.trim()}` });
          }
        });
      }
    }

    if (hits.length > 0) {
      // eslint-disable-next-line no-console
      console.error("Independent-authorisation patterns detected:\n", JSON.stringify(hits, null, 2));
    }
    expect(hits).toEqual([]);
  });
});
