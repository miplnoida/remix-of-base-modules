/**
 * CH-SIMPLE-P3F-UX.6B — Structural contract guard.
 *
 * Enforces the canonical contract between the recipient-policy evaluator
 * and the send-decision core:
 *
 *   1. The core must read `v_recip_eval->>'allowed'`.
 *   2. The core must NEVER read `v_recip_eval->>'authorized'`
 *      (that was the UX.6A false-block bug).
 *   3. The core must pass `to` / `cc` / `bcc` keys to the recipient
 *      evaluator — not the outer `*_recipients` shape (UX.6B bug).
 *
 * The guard scans every migration that defines
 * `_evaluate_comm_hub_send_decision_core` and asserts these properties on
 * the LATEST definition (highest migration timestamp).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = "supabase/migrations";
const FUNC_NAME = "_evaluate_comm_hub_send_decision_core";

function findLatestDefinition(): { file: string; body: string } {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // ISO timestamp prefix sorts lexicographically
  const hits: Array<{ file: string; body: string }> = [];
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    // Extract every CREATE OR REPLACE FUNCTION ... _evaluate_comm_hub_send_decision_core block
    // Strict: the function name must appear directly after FUNCTION, otherwise
    // we can spuriously match a different function whose body happens to
    // reference the canonical name (e.g. the Slice A pure evaluator).
    const re = new RegExp(
      `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${FUNC_NAME}\\s*\\([\\s\\S]*?\\$function\\$;`,
      "gi",
    );

    let m;
    while ((m = re.exec(sql)) !== null) {
      hits.push({ file: f, body: m[0] });
    }
  }
  if (hits.length === 0) {
    throw new Error(`No definitions of ${FUNC_NAME} found under ${MIGRATIONS_DIR}`);
  }
  return hits[hits.length - 1];
}

describe("send-decision core structural contract", () => {
  const { body, file } = findLatestDefinition();

  it(`latest definition (${file}) reads v_recip_eval->>'allowed'`, () => {
    expect(body).toMatch(/v_recip_eval\s*->>\s*'allowed'/);
  });

  it("latest definition NEVER reads v_recip_eval->>'authorized'", () => {
    expect(body).not.toMatch(/v_recip_eval\s*->>\s*'authorized'/);
  });

  it("latest definition passes to/cc/bcc keys (not *_recipients) into evaluate_comm_hub_recipient_policy", () => {
    // Locate the argument object literal for evaluate_comm_hub_recipient_policy(...)
    const callMatch = body.match(
      /evaluate_comm_hub_recipient_policy\s*\(\s*jsonb_build_object\s*\(([\s\S]*?)\)\s*\)/,
    );
    expect(callMatch, "call site not found").toBeTruthy();
    const args = callMatch![1];
    expect(args).toMatch(/'to'/);
    expect(args).toMatch(/'cc'/);
    expect(args).toMatch(/'bcc'/);
    // These outer-shape keys must NOT be forwarded to the inner evaluator.
    expect(args).not.toMatch(/'to_recipients'/);
    expect(args).not.toMatch(/'cc_recipients'/);
    expect(args).not.toMatch(/'bcc_recipients'/);
  });
});
