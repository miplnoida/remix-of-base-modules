/**
 * CH-SIMPLE-P2B — Recipient Policy service contract tests.
 *
 * These are pure source-level assertions: they verify that the canonical
 * recipient policy service does not hardcode any recipient identity, that it
 * always talks to the singleton row and canonical RPCs, and that the settings
 * UI does not bypass the writer.
 *
 * No database calls, no fixtures, no mocks — the goal is to lock the shape of
 * the code, not exercise it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SERVICE = resolve(__dirname, "..", "recipientPolicyService.ts");
const UI = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "pages",
  "admin",
  "communicationHub",
  "recipientControl",
  "RecipientPolicySettingsPage.tsx"
);

const service = readFileSync(SERVICE, "utf8");
const ui = readFileSync(UI, "utf8");

describe("CH-SIMPLE-P2B recipient policy service", () => {
  it("never hardcodes a recipient email or the pilot domain", () => {
    expect(service).not.toMatch(/rohit@/i);
    expect(service).not.toMatch(/mishainfotech\.com/i);
  });

  it("reads only the singleton row (no .order() on the policy table)", () => {
    expect(service).toMatch(/singleton_guard["'`]\s*,\s*RECIPIENT_POLICY_SINGLETON_GUARD/);
    expect(service).not.toMatch(/\.order\(\s*["']updated_at/);
  });

  it("writes only through the canonical set_communication_recipient_policy RPC", () => {
    // Direct table writes are forbidden in this service.
    expect(service).not.toMatch(
      /from\(\s*["']communication_hub_recipient_policy["']\s*\)\s*\.\s*(update|insert|delete|upsert)/
    );
    expect(service).toMatch(/["']set_communication_recipient_policy["']/);
  });

  it("delegates authoriser decisions to evaluate_comm_hub_recipient_policy", () => {
    expect(service).toMatch(/["']evaluate_comm_hub_recipient_policy["']/);
  });

  it("declares every certified recipient mode", () => {
    for (const m of [
      "DISABLED",
      "SINGLE_CONFIGURED_RECIPIENT",
      "APPROVED_NAMED_RECIPIENTS",
      "APPROVED_DOMAINS",
      "CONTROLLED_EXTERNAL_RECIPIENTS",
    ]) {
      expect(service).toContain(`"${m}"`);
    }
  });

  it("requires a change reason before invoking the writer", () => {
    expect(service).toMatch(/reason\?\.trim\(\)/);
  });
});

describe("CH-SIMPLE-P2B recipient policy UI", () => {
  it("routes every save through updateRecipientPolicy (no direct RPC or table writes)", () => {
    expect(ui).toMatch(/updateRecipientPolicy\(/);
    expect(ui).not.toMatch(/\.from\(\s*["']communication_hub_recipient_policy["']\s*\)/);
    expect(ui).not.toMatch(/set_communication_recipient_policy/); // must go via service
  });

  it("never hardcodes a recipient identity in the UI", () => {
    expect(ui).not.toMatch(/rohit@/i);
    expect(ui).not.toMatch(/mishainfotech\.com/i);
  });

  it("disables the not-certified CONTROLLED_EXTERNAL_RECIPIENTS mode", () => {
    expect(ui).toMatch(/CONTROLLED_EXTERNAL_RECIPIENTS[\s\S]*not certified/);
  });

  it("evaluates recipients through the canonical evaluator only", () => {
    expect(ui).toMatch(/evaluateRecipientPolicy\(/);
  });
});
