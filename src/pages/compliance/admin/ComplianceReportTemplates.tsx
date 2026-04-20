import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Layers, Palette, Settings2, Shield, Link2 } from "lucide-react";
import {
  CE_TEMPLATE_TYPES,
  CETemplateType,
  useComplianceFoundation,
  useComplianceSectionLibrary,
  useComplianceTemplateSections,
  useComplianceTemplateSettings,
  useUpdateComplianceTemplateSection,
} from "@/hooks/useComplianceDocumentTemplates";
import { auditCommunicationTemplateService } from "@/services/auditCommunicationTemplateService";
import { COMM_LIFECYCLE_STAGE_LABELS, COMM_LIFECYCLE_STAGE_ORDER, type CeCommLifecycleStage } from "@/types/auditCommunication";

export default function ComplianceReportTemplates() {
  const [activeTemplate, setActiveTemplate] = useState<CETemplateType>("employer_audit_report");

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Compliance Report Templates</h1>
          <Badge variant="outline" className="ml-2">Employer Audit</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Templates designed specifically for Social Security <strong>employer compliance audits</strong>.
          This module is fully separate from Internal Audit document templates.
        </p>
      </header>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2"><FileText className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="sections" className="gap-2"><Layers className="h-4 w-4" />Section Library</TabsTrigger>
          <TabsTrigger value="foundation" className="gap-2"><Palette className="h-4 w-4" />Foundation</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Template Types</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[480px]">
                  <div className="p-2 space-y-1">
                    {CE_TEMPLATE_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setActiveTemplate(t.value)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          activeTemplate === t.value
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="font-medium">{t.label}</div>
                        <div className={`text-xs mt-0.5 ${activeTemplate === t.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {t.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <TemplateEditor templateType={activeTemplate} />
          </div>
        </TabsContent>

        <TabsContent value="sections">
          <SectionLibraryTab />
        </TabsContent>

        <TabsContent value="foundation">
          <FoundationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateEditor({ templateType }: { templateType: CETemplateType }) {
  const { data: sections, isLoading } = useComplianceTemplateSections(templateType);
  const { data: settings, update: updateSettings } = useComplianceTemplateSettings(templateType);
  const updateSection = useUpdateComplianceTemplateSection();
  const meta = useMemo(() => CE_TEMPLATE_TYPES.find((t) => t.value === templateType)!, [templateType]);

  const [configDraft, setConfigDraft] = useState<string>("");

  const configValue = useMemo(() => {
    return JSON.stringify((settings as any)?.config_json ?? {}, null, 2);
  }, [settings]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
      </Card>

      <UsedByCommunications reportType={templateType} />

          <CardDescription>Toggle which sections appear in this employer-audit document and the order they print in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (sections ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections configured for this template.</p>
          ) : (
            (sections as any[]).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{row.title_override || row.section_key.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">key: {row.section_key} · order: {row.sort_order}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toc-${row.id}`} className="text-xs">In TOC</Label>
                    <Switch
                      id={`toc-${row.id}`}
                      checked={row.include_in_toc}
                      onCheckedChange={(v) => updateSection.mutate({ id: row.id, template_type: templateType, include_in_toc: v })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`np-${row.id}`} className="text-xs">New page</Label>
                    <Switch
                      id={`np-${row.id}`}
                      checked={row.start_on_new_page}
                      onCheckedChange={(v) => updateSection.mutate({ id: row.id, template_type: templateType, start_on_new_page: v })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`en-${row.id}`} className="text-xs">Enabled</Label>
                    <Switch
                      id={`en-${row.id}`}
                      checked={row.is_enabled}
                      disabled={row.is_required}
                      onCheckedChange={(v) => updateSection.mutate({ id: row.id, template_type: templateType, is_enabled: v })}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" />Template Settings</CardTitle>
          <CardDescription>Per-template-type configuration (JSON).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="font-mono text-xs min-h-[180px]"
            defaultValue={configValue}
            key={configValue}
            onChange={(e) => setConfigDraft(e.target.value)}
            placeholder="{}"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                try {
                  const parsed = JSON.parse(configDraft || configValue);
                  updateSettings.mutate(parsed);
                } catch {
                  // toast handled inside hook
                }
              }}
            >
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsedByCommunications({ reportType }: { reportType: CETemplateType }) {
  const [linked, setLinked] = useState<Array<{ id: string; template_code: string; template_name: string; lifecycle_stage?: string | null; is_active: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    auditCommunicationTemplateService
      .listLinkedToReport(reportType)
      .then((rows) => { if (alive) setLinked(rows as any); })
      .catch(() => { if (alive) setLinked([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reportType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Used by Communications
        </CardTitle>
        <CardDescription>
          Communication templates that attach this report. Linkages are managed from the communication template editor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-full" />
        ) : linked.length === 0 ? (
          <p className="text-xs text-muted-foreground">No communication templates currently link to this report.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linked.map((c) => (
              <Badge key={c.id} variant={c.is_active ? 'secondary' : 'outline'} className="gap-1">
                <span className="font-medium">{c.template_name}</span>
                <span className="text-muted-foreground">({c.template_code})</span>
                {c.lifecycle_stage && (
                  <span className="text-[10px] text-muted-foreground">· {COMM_LIFECYCLE_STAGE_LABELS[c.lifecycle_stage as CeCommLifecycleStage] ?? c.lifecycle_stage}</span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionLibraryTab() {
  const { data, isLoading } = useComplianceSectionLibrary();
  const [stageFilter, setStageFilter] = useState<CeCommLifecycleStage | 'all'>('all');

  const filtered = useMemo(() => {
    const rows = (data as any[]) ?? [];
    if (stageFilter === 'all') return rows;
    return rows.filter((s) => Array.isArray(s.lifecycle_tags) && s.lifecycle_tags.includes(stageFilter));
  }, [data, stageFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compliance Section Library</CardTitle>
        <CardDescription>
          Reusable sections specific to employer compliance audits — independent of the internal audit section catalog.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => setStageFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${stageFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 hover:bg-muted border-border'}`}
          >
            All stages
          </button>
          {COMM_LIFECYCLE_STAGE_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(stageFilter === s ? 'all' : s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${stageFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 hover:bg-muted border-border'}`}
            >
              {COMM_LIFECYCLE_STAGE_LABELS[s]}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No sections match the selected lifecycle stage.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-md border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{s.label}</span>
                    {s.is_mandatory && <Badge variant="destructive" className="text-[10px]">Mandatory</Badge>}
                    <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                    {Array.isArray(s.lifecycle_tags) && s.lifecycle_tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {COMM_LIFECYCLE_STAGE_LABELS[tag as CeCommLifecycleStage] ?? tag}
                      </Badge>
                    ))}
                  </div>
                  {s.description && <div className="text-xs text-muted-foreground mt-1">{s.description}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Applies to: {(s.applies_to ?? []).join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FoundationTab() {
  const { data, isLoading, update } = useComplianceFoundation();
  const [orgName, setOrgName] = useState<string>("");
  const [footerText, setFooterText] = useState<string>("");

  const branding = (data as any)?.branding ?? {};
  const pagination = (data as any)?.pagination ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compliance Document Foundation</CardTitle>
        <CardDescription>
          Branding and layout used across all compliance employer-audit documents. Independent of the internal audit foundation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization name</Label>
                <Input
                  defaultValue={branding.organization_name ?? ""}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Footer text</Label>
                <Input
                  defaultValue={pagination.footer_text ?? ""}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              </div>
            </div>
            <Separator />
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  update.mutate({
                    branding: { ...branding, organization_name: orgName || branding.organization_name },
                    pagination: { ...pagination, footer_text: footerText || pagination.footer_text },
                  })
                }
              >
                Save foundation
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
