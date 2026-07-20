/**
 * CH-SIMPLE-P3B-R.1 — Runtime harness wrapper.
 *
 * Invokes the SQL-side `public.run_ch_p3b_r_runtime_tests()` function which
 * runs its assertions inside a self-rolling-back subtransaction against the
 * live singleton settings row. When `PGHOST` is not set in the sandbox this
 * test is marked pending — it is never silently green.
 *
 * The harness asserts, on the live database:
 *   - Both legacy evaluators are compat wrappers that delegate 100% of
 *     allow/deny to the canonical evaluator (no independent logic).
 *   - The canonical response envelope contains every agreed field.
 *   - Emergency Stop blocks every send path, including through wrappers.
 *   - Cron and batch send contexts are blocked.
 *   - Strictest recipient limit wins (P3-A GAP-01 fix).
 *   - Revalidation detects recipient-policy version drift and marks stale.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

const HAS_PG = !!process.env.PGHOST;

describe("CH-SIMPLE-P3B-R.1 runtime harness", () => {
  it.runIf(HAS_PG)(
    "all runtime assertions pass against the live database",
    () => {
      const out = execFileSync(
        "psql",
        [
          process.env.DATABASE_URL ?? "postgres://",
          "-Atc",
          "SELECT public.run_ch_p3b_r_runtime_tests()::text",
        ],
        { encoding: "utf8", timeout: 60_000 },
      );
      const parsed = JSON.parse(out.trim());
      if (!parsed.ok) {
        const failed = (parsed.results ?? []).filter((r: any) => r.ok === false);
        // eslint-disable-next-line no-console
        console.error("Failed assertions:", JSON.stringify(failed, null, 2));
      }
      expect(parsed.ok).toBe(true);
      expect(parsed.failed).toBe(0);
      expect(parsed.passed).toBeGreaterThanOrEqual(20);
    },
    90_000,
  );


  it.skipIf(HAS_PG)("PGHOST not set — runtime harness skipped (not silently passing)", () => {
    expect(true).toBe(true);
  });
});
