/**
 * Phase 13 — Enterprise Configuration Health Checks
 *
 * Read-only checks across the comm/branding stack. Each finding carries
 * a link that the dashboard uses to deep-link to the owner screen.
 */

import { supabase } from "@/integrations/supabase/client";

export type HealthSeverity = "error" | "warning" | "info";

export interface HealthFinding {
  id: string;
  severity: HealthSeverity;
  category: string;
  message: string;
  link?: { screen: string; recordId?: string | null };
}

type Check = () => Promise<HealthFinding[]>;

// Single cast keeps TS inference shallow across the entire file.
const client = supabase as any;

const checks: Check[] = [
  async () => {
    const { data } = await client
      .from("core_organization")
      .select("id, legal_name, main_email, main_phone, website")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const out: HealthFinding[] = [];
    if (!data) {
      out.push({
        id: "org-missing",
        severity: "error",
        category: "Organization",
        message: "No organization profile configured.",
        link: { screen: "OrganizationProfilePage" },
      });
      return out;
    }
    const need: Array<[string, unknown]> = [
      ["support email", data.main_email],
      ["support phone", data.main_phone],
      ["website", data.website],
    ];
    for (const [label, v] of need) {
      if (!v) {
        out.push({
          id: `org-missing-${label}`,
          severity: "warning",
          category: "Organization",
          message: `Organization profile missing ${label}.`,
          link: { screen: "OrganizationProfilePage", recordId: data.id },
        });
      }
    }
    return out;
  },

  async () => {
    const { data } = await client
      .from("comm_media_asset")
      .select("id, asset_code")
      .eq("asset_code", "PRIMARY_LOGO")
      .maybeSingle();
    return data
      ? []
      : [
          {
            id: "logo-missing",
            severity: "error" as HealthSeverity,
            category: "Assets",
            message: "No PRIMARY_LOGO asset configured.",
            link: { screen: "MediaLibraryPage" },
          },
        ];
  },

  async () => {
    // Inactive assets still mapped.
    const { data: maps } = await client
      .from("comm_asset_mapping")
      .select("id, asset_id, is_active")
      .eq("is_active", true)
      .limit(500);
    if (!maps?.length) return [];
    const ids = Array.from(
      new Set(maps.map((m: any) => m.asset_id).filter(Boolean)),
    );
    const { data: assets } = await client
      .from("comm_media_asset")
      .select("id, asset_code, is_active")
      .in("id", ids);
    const inactive = new Map(
      (assets ?? [])
        .filter((a: any) => !a.is_active)
        .map((a: any) => [a.id, a.asset_code]),
    );
    return maps
      .filter((m: any) => inactive.has(m.asset_id))
      .map((m: any) => ({
        id: `inactive-asset-${m.id}`,
        severity: "warning" as HealthSeverity,
        category: "Assets",
        message: `Inactive asset ${inactive.get(m.asset_id)} is still mapped.`,
        link: { screen: "MediaLibraryPage", recordId: m.asset_id },
      }));
  },

  async () => {
    const { data } = await client
      .from("core_department_profile")
      .select("id, department_id")
      .is("department_id", null)
      .limit(50);
    return (data ?? []).map((r: any) => ({
      id: `orphan-deptprof-${r.id}`,
      severity: "warning" as HealthSeverity,
      category: "Departments",
      message: "Department profile has no parent department.",
      link: { screen: "DepartmentProfilesPage", recordId: r.id },
    }));
  },

  async () => {
    const { data: tmpls } = await client
      .from("core_template")
      .select("id, code, parent_template_id")
      .not("parent_template_id", "is", null)
      .limit(500);
    if (!tmpls?.length) return [];
    const parentIds = Array.from(
      new Set(tmpls.map((t: any) => t.parent_template_id).filter(Boolean)),
    );
    const { data: parents } = await client
      .from("core_template")
      .select("id")
      .in("id", parentIds);
    const live = new Set((parents ?? []).map((p: any) => p.id));
    return tmpls
      .filter((t: any) => !live.has(t.parent_template_id))
      .map((t: any) => ({
        id: `broken-parent-${t.id}`,
        severity: "error" as HealthSeverity,
        category: "Templates",
        message: `Template ${t.code} references missing parent template.`,
        link: { screen: "TemplateDesigner", recordId: t.id },
      }));
  },

  async () => {
    const { data: tb } = await client
      .from("core_text_block")
      .select("id, text_block_code")
      .limit(1000);
    const codes = new Set(
      (tb ?? []).map((r: any) => r.text_block_code).filter(Boolean),
    );
    const { data: vers } = await client
      .from("core_template_version")
      .select("template_id, body_html, body_text")
      .limit(500);
    const findings: HealthFinding[] = [];
    for (const v of vers ?? []) {
      const body = String((v as any).body_html ?? (v as any).body_text ?? "");
      const refs = Array.from(
        body.matchAll(/\{\{\s*text_block\.([A-Z0-9_]+)\s*\}\}/g),
      );
      for (const m of refs) {
        if (!codes.has(m[1])) {
          findings.push({
            id: `missing-tb-${(v as any).template_id}-${m[1]}`,
            severity: "error",
            category: "Text Blocks",
            message: `Template references missing text block ${m[1]}.`,
            link: {
              screen: "TextBlocksPage",
              recordId: (v as any).template_id,
            },
          });
        }
      }
    }
    return findings;
  },
];

export async function runHealthChecks(): Promise<HealthFinding[]> {
  const all = await Promise.allSettled(checks.map((c) => c()));
  return all.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
