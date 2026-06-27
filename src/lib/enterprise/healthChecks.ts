/**
 * Phase 13 — Enterprise Configuration Health Checks
 *
 * Runs a battery of read-only checks against the comm/branding stack
 * and returns a list of findings categorized by severity. Each finding
 * carries a `link` describing which owner screen + record id to jump to.
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

const checks: Check[] = [
  async () => {
    // Missing organization defaults
    const { data } = await supabase
      .from("core_organization")
      .select("id, name, support_email, support_phone, website")
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
      ["support email", data.support_email],
      ["support phone", data.support_phone],
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
    // Missing primary logo
    const { data } = await supabase
      .from("comm_media_asset")
      .select("id, code")
      .eq("code", "PRIMARY_LOGO")
      .maybeSingle();
    return data
      ? []
      : [
          {
            id: "logo-missing",
            severity: "error",
            category: "Assets",
            message: "No PRIMARY_LOGO asset configured.",
            link: { screen: "MediaLibraryPage" },
          },
        ];
  },

  async () => {
    // Inactive assets still referenced
    const { data } = await supabase
      .from("comm_asset_mapping")
      .select("asset_id, comm_media_asset!inner(id, code, is_active)")
      .eq("comm_media_asset.is_active", false)
      .limit(50);
    return (data ?? []).map((row: any) => ({
      id: `inactive-asset-${row.asset_id}`,
      severity: "warning" as HealthSeverity,
      category: "Assets",
      message: `Inactive asset ${row.comm_media_asset?.code} is still mapped.`,
      link: { screen: "MediaLibraryPage", recordId: row.asset_id },
    }));
  },

  async () => {
    // Orphan department profiles (no parent department)
    const { data } = await supabase
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
    // Broken template parent (parent_template_id pointing to deleted row)
    const { data: tmpls } = await supabase
      .from("core_template")
      .select("id, code, parent_template_id")
      .not("parent_template_id", "is", null)
      .limit(500);
    if (!tmpls?.length) return [];
    const parentIds = Array.from(
      new Set(tmpls.map((t: any) => t.parent_template_id).filter(Boolean)),
    );
    const { data: parents } = await supabase
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
    // Text blocks referenced but missing
    const { data: tb } = await supabase
      .from("core_text_block")
      .select("id, code")
      .limit(1000);
    const codes = new Set((tb ?? []).map((r: any) => r.code));
    const { data: tmpls } = await supabase
      .from("core_template_version")
      .select("template_id, body")
      .limit(500);
    const findings: HealthFinding[] = [];
    for (const v of tmpls ?? []) {
      const refs = Array.from(
        String((v as any).body ?? "").matchAll(
          /\{\{\s*text_block\.([A-Z0-9_]+)\s*\}\}/g,
        ),
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
