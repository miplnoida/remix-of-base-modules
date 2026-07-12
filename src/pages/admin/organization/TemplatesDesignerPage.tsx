/**
 * OM-5 — Document Templates page.
 *
 * Canonical storage is `core_template` (+ `core_template_version` for bodies,
 * `core_template_layout` for layouts). This page renders the full canonical
 * editor via `CoreTemplateManagement` and — non-destructively — surfaces legacy
 * `comm_letterhead` rows that were being used as document templates in a
 * clearly-labelled Legacy Compatibility panel. Legacy rows remain editable
 * through the historical TemplateDesignerDialog to avoid data loss during the
 * transition; no automatic migration is performed.
 *
 * Letterheads themselves (layout/branding shells) are managed on the
 * Letterheads page and are NOT the primary storage for document bodies.
 */
import { Suspense, lazy, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, LayoutTemplate, ChevronDown, ChevronRight, Edit } from "lucide-react";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { OrgActionGate, ORG_PERMS } from "@/platform/organization/orgActionPermissions";
import { TemplateDesignerDialog } from "@/components/comm/TemplateDesignerDialog";
import { useDocumentTemplateCompatibilityRows } from "@/platform/communication-template/useTemplates";

const CoreTemplateManagement = lazy(() => import("@/components/templates/CoreTemplateManagement"));

function CompatibilityPanel() {
  const { data: rows = [], isLoading } = useDocumentTemplateCompatibilityRows();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);

  if (isLoading) return null;
  if (!rows.length) return null;

  return (
    <Card className="border-amber-300/70">
      <CardHeader className="pb-2">
        <button
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <CardTitle className="text-base">Legacy Letterhead Compatibility</CardTitle>
            <Badge variant="outline" className="ml-1">{rows.length}</Badge>
          </div>
          <CardDescription className="text-xs">
            Historical rows still stored in <code className="font-mono">comm_letterhead</code>. Not migrated.
          </CardDescription>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2 pt-0">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Read-through compatibility mode</AlertTitle>
            <AlertDescription>
              Historical templates that pre-date the Letterhead / Document Template split.
              They remain editable to preserve continuity. Author new templates in the canonical store above.
            </AlertDescription>
          </Alert>
          <div className="divide-y rounded-md border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {r.code} · {r.template_type ?? "LEGACY"}
                    {r.module_code ? ` · ${r.module_code}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Compatibility</Badge>
                  <OrgActionGate permission={ORG_PERMS.templates.manage}>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </OrgActionGate>
                </div>
              </div>
            ))}
          </div>
          <TemplateDesignerDialog
            open={editing !== undefined}
            onOpenChange={(v) => !v && setEditing(undefined)}
            initial={editing ?? null}
          />
        </CardContent>
      )}
    </Card>
  );
}

function Inner() {
  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-start gap-3">
        <LayoutTemplate className="h-6 w-6 text-primary mt-1" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Official document and communication templates. A template can link to a Letterhead as its layout shell —
            Letterheads themselves are managed under <b>Brand Assets → Letterheads</b>.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading templates…</div>}>
        <CoreTemplateManagement showAllModules />
      </Suspense>

      <CompatibilityPanel />
    </div>
  );
}

export default function TemplatesDesignerPage() {
  return (
    <PermissionWrapper moduleName="org_templates">
      <Inner />
    </PermissionWrapper>
  );
}
