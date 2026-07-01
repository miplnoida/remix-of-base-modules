import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Counts {
  base_layouts: number;
  business_templates: number;
  bridged_templates: number;
  legacy_total: number;
  legacy_mapped: number;
  legacy_pending: number;
}

export default function ArchitectureReportTab() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      const [bl, biz, bridged, legTot, legMap, legPend] = await Promise.all([
        supabase.from("core_template_layout").select("id", { count: "exact", head: true }).eq("is_base_layout", true as never),
        supabase.from("core_template").select("id", { count: "exact", head: true }).like("code", "BIZ_%"),
        supabase.from("core_template").select("id", { count: "exact", head: true }).eq("source_system", "notification_templates"),
        supabase.from("notification_templates").select("id", { count: "exact", head: true }),
        supabase.from("notification_templates").select("id", { count: "exact", head: true }).eq("migration_status", "mapped" as never),
        supabase.from("notification_templates").select("id", { count: "exact", head: true }).eq("migration_status", "pending" as never),
      ]);
      setCounts({
        base_layouts: bl.count ?? 0,
        business_templates: biz.count ?? 0,
        bridged_templates: bridged.count ?? 0,
        legacy_total: legTot.count ?? 0,
        legacy_mapped: legMap.count ?? 0,
        legacy_pending: legPend.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Communication Framework — Report</CardTitle>
          <CardDescription>Single template engine · single rendering pipeline · single branding & inheritance model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Metric label="Base Layouts (Core Catalogue)" value={counts?.base_layouts} />
            <Metric label="Business Templates" value={counts?.business_templates} />
            <Metric label="Bridged (from legacy)" value={counts?.bridged_templates} />
            <Metric label="Legacy Templates" value={counts?.legacy_total} />
            <Metric label="Legacy → Mapped" value={counts?.legacy_mapped} tone="success" />
            <Metric label="Legacy → Pending" value={counts?.legacy_pending} tone="warn" />
          </section>

          <Section title="Rendering Pipeline">
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
{`Business Template
  ↓
Base Layout (BASE_EMAIL / BASE_LETTER / BASE_PDF / …)
  ↓
Brand Assets (logo, banner, letterhead, watermark)
  ↓
Configuration Center (core_configuration_assignment)
  ↓
Organization → Department → Module → Workflow → Business Event
  ↓
Language + Text Blocks + Tokens
  ↓
Final HTML / PDF / SMS / Push / In-App`}
            </pre>
          </Section>

          <Section title="Menu Mapping">
            <ul className="text-sm space-y-1 list-disc pl-5">
              <li><code>/admin/notification-templates</code> → Enterprise hub (this page)</li>
              <li><code>?tab=templates</code> → Business Templates</li>
              <li><code>?tab=core</code> → Core Catalogue (base layouts + shared shells)</li>
              <li><code>?tab=org</code> → Organization Overrides (communication defaults)</li>
              <li><code>?tab=legacy</code> → Legacy bridge to <code>notification_templates</code></li>
              <li><code>?tab=report</code> → This report</li>
              <li>All module deep links (Legal, Benefits, Compliance, …) route to the same Core Template Designer with filters</li>
            </ul>
          </Section>

          <Section title="Inheritance / Override Hierarchy">
            <pre className="text-xs bg-muted p-4 rounded">
{`Global → Organization → Department → Module → Workflow → Workflow Stage → Business Event → Template Override
Applies to: Header · Footer · Signature · Disclaimer · Letterhead · Theme · Language · Reply-To · BCC · Sender · Brand Assets`}
            </pre>
          </Section>

          <Section title="Legacy Compatibility">
            <p className="text-sm">
              <code>notification_templates</code> is preserved. Every row is mirrored into <code>core_template</code> (code prefix <code>LEGACY_</code>) and linked back through <code>mapped_core_template_id</code>. Legacy runtime continues untouched; enterprise resolver can serve the same content when needed.
            </p>
          </Section>

          <Section title="Services Reused">
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><code>coreTemplateResolverService</code> — composes body + layout + branding + tokens</li>
              <li><code>resolveCommunication()</code> in <code>@/lib/enterprise</code> — single entry for every module</li>
              <li><code>resolveDocument</code>, <code>resolveFinancialDoc</code>, <code>resolveNotification</code>, <code>resolvePortalBranding</code></li>
              <li>Text Blocks are the source of truth for disclaimers (previous phase)</li>
            </ul>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value?: number; tone?: "success" | "warn" }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-2xl font-semibold">
        {value ?? "—"}
        {tone === "success" && <Badge className="ml-2 bg-green-600">OK</Badge>}
        {tone === "warn" && <Badge className="ml-2" variant="outline">Review</Badge>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </section>
  );
}
