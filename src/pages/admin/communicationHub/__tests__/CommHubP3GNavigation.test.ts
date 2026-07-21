/**
 * CH-SIMPLE-P3G — Menu governance scan.
 *
 * Enforces the primary navigation contract for the Communication Hub:
 *   - Go Live is registered as a primary route.
 *   - Legacy technical workflows (Pilots, Governance) are re-parented under
 *     Advanced Diagnostics and never appear at the primary level.
 *   - Recipient Policy is not duplicated across groups.
 *
 * This test reads the DB-driven menu directly, matching the runtime
 * source of truth (public.app_modules).
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://xynceskeiiisiefqlgxo.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmNlc2tlaWlpc2llZnFsZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxMDAsImV4cCI6MjA4ODczMDEwMH0.kVVysArl8ujrAHpHLtNx7xifYyq02ulIE5c4WKKSXCI";

const HUB_ID = "c0110000-0000-4000-8000-000000000001";
const ADVANCED_DIAGNOSTICS_ID = "c0110000-0000-4000-8000-0000000000a4";
const SETTINGS_ID = "c0110000-0000-4000-8000-0000000000a3";

const REQUIRED_PRIMARY_GROUPS = [
  "communication_hub_go_live",
  "communication_hub_events_templates",
  "communication_hub_operations",
  "communication_hub_settings",
  "communication_hub_advanced_diagnostics",
];

describe("CH-SIMPLE-P3G — menu structure governance", () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  it("registers the five required primary groups directly under Communication Hub", async () => {
    const { data, error } = await supabase
      .from("app_modules")
      .select("name, parent_id, sort_order")
      .eq("parent_id", HUB_ID);
    expect(error).toBeNull();
    const names = new Set((data ?? []).map((r: any) => r.name));
    for (const req of REQUIRED_PRIMARY_GROUPS) {
      expect(names.has(req), `missing primary node: ${req}`).toBe(true);
    }
  });

  it("Pilots is not registered at the primary level", async () => {
    const { data } = await supabase
      .from("app_modules")
      .select("name, parent_id")
      .eq("name", "communication_hub_pilots")
      .maybeSingle();
    expect(data?.parent_id, "Pilots must be re-parented under Advanced Diagnostics").toBe(
      ADVANCED_DIAGNOSTICS_ID,
    );
  });

  it("Governance harness is not registered at the primary level", async () => {
    const { data } = await supabase
      .from("app_modules")
      .select("name, parent_id")
      .eq("name", "communication_hub_governance")
      .maybeSingle();
    expect(data?.parent_id).toBe(ADVANCED_DIAGNOSTICS_ID);
  });

  it("Operating Mode & Emergency Stop lives under Settings", async () => {
    const { data } = await supabase
      .from("app_modules")
      .select("name, parent_id")
      .eq("name", "communication_hub_control_center")
      .maybeSingle();
    expect(data?.parent_id).toBe(SETTINGS_ID);
  });

  it("Recipient Policy is not duplicated across primary groups", async () => {
    const { data } = await supabase
      .from("app_modules")
      .select("name")
      .ilike("name", "%recipient_policy%");
    // Any recipient-policy rows must belong to a single canonical entry.
    const codes = new Set((data ?? []).map((r: any) => r.name));
    expect(codes.size).toBeLessThanOrEqual(1);
  });
});
