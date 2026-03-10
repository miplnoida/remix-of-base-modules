import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search, ChevronDown, ChevronRight, Copy, Download,
  Database, Brain, FileText, Zap, Link2, Shield, BookOpen,
  Loader2, RefreshCw, AlertTriangle,
} from "lucide-react";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { developerInfoService, FullDevInfo } from "@/services/developerInfoService";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRoute: string;
}

export const DeveloperInfoModal = ({ open, onOpenChange, currentRoute }: Props) => {
  const { profile, roles } = useSupabaseAuth();
  const [devInfo, setDevInfo] = useState<FullDevInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    business: true,
    tables: false,
    logic: false,
    fields: false,
    actions: false,
    dependencies: false,
    audit: false,
    documents: false,
  });

  useEffect(() => {
    if (open && currentRoute) {
      loadDevInfo();
    }
  }, [open, currentRoute]);

  const loadDevInfo = async () => {
    setLoading(true);
    try {
      const screen = await developerInfoService.getScreenByRoute(currentRoute);
      if (screen) {
        const full = await developerInfoService.getFullDevInfo(screen.id);
        setDevInfo(full);

        // Log access
        await developerInfoService.logAccess({
          screenId: screen.id,
          screenCode: screen.screen_code,
          accessedBy: profile?.user_code || 'unknown',
          userRole: roles?.[0] || 'Admin',
        });
      } else {
        setDevInfo(null);
      }
    } catch (err) {
      console.error('Failed to load dev info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!devInfo?.screen) return;
    setAnalyzing(true);
    try {
      await developerInfoService.triggerAIAnalysis(devInfo.screen.id, currentRoute);
      toast.success('AI analysis completed. Refreshing...');
      await loadDevInfo();
    } catch (err: any) {
      toast.error(err.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!devInfo) return;
    const text = JSON.stringify(devInfo, null, 2);
    navigator.clipboard.writeText(text);
    toast.success('Developer info copied to clipboard');
  };

  const handleExport = () => {
    if (!devInfo) return;
    const blob = new Blob([JSON.stringify(devInfo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-info-${devInfo.screen.screen_code}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'reviewed': return 'secondary';
      case 'auto_extracted': return 'outline';
      default: return 'destructive';
    }
  };

  const filterText = (text: string | null | undefined) => {
    if (!text || !searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                Developer Information
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Route: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{currentRoute}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {devInfo?.screen && (
                <Badge variant={statusColor(devInfo.screen.documentation_status)}>
                  {devInfo.screen.documentation_status?.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search within developer info..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!devInfo}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!devInfo}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
            {devInfo?.screen && (
              <Button variant="outline" size="sm" onClick={handleAIAnalysis} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Re-analyze
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !devInfo ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Developer Information</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                This screen has not been documented yet. Run the auto-population process from the Admin Maintenance page to generate documentation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overview Section */}
              <CollapsibleSection
                title="Overview"
                icon={<FileText className="h-4 w-4" />}
                isOpen={openSections.overview}
                onToggle={() => toggleSection('overview')}
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Screen Code" value={devInfo.screen.screen_code} />
                  <InfoRow label="Screen Name" value={devInfo.screen.screen_name} />
                  <InfoRow label="Module" value={devInfo.screen.module_name} />
                  <InfoRow label="Submodule" value={devInfo.screen.submodule_name} />
                  <InfoRow label="Screen Type" value={devInfo.screen.screen_type} />
                  <InfoRow label="Menu Path" value={devInfo.screen.menu_path} />
                  <InfoRow label="Primary Roles" value={devInfo.screen.primary_user_roles} />
                  <InfoRow label="Trigger" value={devInfo.screen.trigger_context} />
                </div>
              </CollapsibleSection>

              {/* Business Purpose */}
              <CollapsibleSection
                title="Business Purpose"
                icon={<Brain className="h-4 w-4" />}
                isOpen={openSections.business}
                onToggle={() => toggleSection('business')}
              >
                <div className="space-y-3 text-sm">
                  {devInfo.screen.functional_summary && (
                    <div>
                      <label className="font-medium text-muted-foreground">Functional Summary</label>
                      <p className="mt-1 whitespace-pre-wrap">{devInfo.screen.functional_summary}</p>
                    </div>
                  )}
                  {devInfo.screen.business_purpose && (
                    <div>
                      <label className="font-medium text-muted-foreground">Business Purpose</label>
                      <p className="mt-1 whitespace-pre-wrap">{devInfo.screen.business_purpose}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Upstream Screens" value={devInfo.screen.upstream_screens} />
                    <InfoRow label="Downstream Screens" value={devInfo.screen.downstream_screens} />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Tables Used */}
              <CollapsibleSection
                title={`Tables Used (${devInfo.tables.length})`}
                icon={<Database className="h-4 w-4" />}
                isOpen={openSections.tables}
                onToggle={() => toggleSection('tables')}
              >
                {devInfo.tables.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No table mappings documented</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Table</th>
                          <th className="text-left px-3 py-2 font-medium">Type</th>
                          <th className="text-left px-3 py-2 font-medium">Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devInfo.tables.filter(t => filterText(t.table_name) || filterText(t.purpose)).map(t => (
                          <tr key={t.id} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{t.table_name}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs">{t.table_type}</Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{t.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>

              {/* Business Logic */}
              <CollapsibleSection
                title={`Business Logic (${devInfo.logic.length})`}
                icon={<Brain className="h-4 w-4" />}
                isOpen={openSections.logic}
                onToggle={() => toggleSection('logic')}
              >
                {devInfo.logic.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No business logic documented</p>
                ) : (
                  <div className="space-y-2">
                    {devInfo.logic.filter(l => filterText(l.logic_title) || filterText(l.logic_description)).map(l => (
                      <div key={l.id} className="border rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{l.logic_type}</Badge>
                          <span className="font-medium text-sm">{l.logic_title}</span>
                        </div>
                        {l.logic_description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{l.logic_description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Fields */}
              <CollapsibleSection
                title={`Fields (${devInfo.fields.length})`}
                icon={<FileText className="h-4 w-4" />}
                isOpen={openSections.fields}
                onToggle={() => toggleSection('fields')}
              >
                {devInfo.fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No field documentation</p>
                ) : (
                  <div className="border rounded-md overflow-auto max-h-[400px]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-medium">Field</th>
                          <th className="text-left px-2 py-1.5 font-medium">Label</th>
                          <th className="text-left px-2 py-1.5 font-medium">Type</th>
                          <th className="text-left px-2 py-1.5 font-medium">Req</th>
                          <th className="text-left px-2 py-1.5 font-medium">Source</th>
                          <th className="text-left px-2 py-1.5 font-medium">Validation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devInfo.fields.filter(f => filterText(f.field_name) || filterText(f.field_label)).map(f => (
                          <tr key={f.id} className="border-t">
                            <td className="px-2 py-1.5 font-mono">{f.field_name}</td>
                            <td className="px-2 py-1.5">{f.field_label}</td>
                            <td className="px-2 py-1.5">{f.control_type}</td>
                            <td className="px-2 py-1.5">{f.is_required ? 'Y' : 'N'}</td>
                            <td className="px-2 py-1.5 font-mono">{f.source_table ? `${f.source_table}.${f.source_column}` : '-'}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{f.validation_rule || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>

              {/* Actions */}
              <CollapsibleSection
                title={`Actions (${devInfo.actions.length})`}
                icon={<Zap className="h-4 w-4" />}
                isOpen={openSections.actions}
                onToggle={() => toggleSection('actions')}
              >
                {devInfo.actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No actions documented</p>
                ) : (
                  <div className="space-y-2">
                    {devInfo.actions.filter(a => filterText(a.action_name) || filterText(a.action_description)).map(a => (
                      <div key={a.id} className="border rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{a.action_name}</span>
                          {a.action_type && <Badge variant="outline" className="text-xs">{a.action_type}</Badge>}
                          {a.permission_required && <Badge variant="secondary" className="text-xs">🔒 {a.permission_required}</Badge>}
                        </div>
                        {a.action_description && <p className="text-sm text-muted-foreground">{a.action_description}</p>}
                        {a.tables_affected && <p className="text-xs mt-1"><span className="font-medium">Tables:</span> {a.tables_affected}</p>}
                        {a.api_or_service_called && <p className="text-xs"><span className="font-medium">API/Service:</span> {a.api_or_service_called}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Dependencies */}
              <CollapsibleSection
                title={`Dependencies (${devInfo.dependencies.length})`}
                icon={<Link2 className="h-4 w-4" />}
                isOpen={openSections.dependencies}
                onToggle={() => toggleSection('dependencies')}
              >
                {devInfo.dependencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No dependencies documented</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Type</th>
                          <th className="text-left px-3 py-2 font-medium">Name</th>
                          <th className="text-left px-3 py-2 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devInfo.dependencies.map(d => (
                          <tr key={d.id} className="border-t">
                            <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{d.dependency_type}</Badge></td>
                            <td className="px-3 py-2 font-medium">{d.dependency_name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{d.dependency_details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>

              {/* Audit & Logging */}
              <CollapsibleSection
                title={`Audit & Logging (${devInfo.audit.length})`}
                icon={<Shield className="h-4 w-4" />}
                isOpen={openSections.audit}
                onToggle={() => toggleSection('audit')}
              >
                {devInfo.audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No audit behavior documented</p>
                ) : (
                  <div className="space-y-2">
                    {devInfo.audit.map(a => (
                      <div key={a.id} className="border rounded-md p-3 flex items-start gap-3">
                        <Badge variant={a.is_enabled ? 'default' : 'secondary'} className="text-xs mt-0.5">
                          {a.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{a.audit_type}</p>
                          <p className="text-sm text-muted-foreground">{a.audit_description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Documentation */}
              <CollapsibleSection
                title={`Documentation (${devInfo.documents.length})`}
                icon={<BookOpen className="h-4 w-4" />}
                isOpen={openSections.documents}
                onToggle={() => toggleSection('documents')}
              >
                {devInfo.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No documentation linked</p>
                ) : (
                  <div className="space-y-2">
                    {devInfo.documents.map(d => (
                      <div key={d.id} className="border rounded-md p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{d.document_type}</Badge>
                          <span className="text-sm font-medium">{d.document_name}</span>
                        </div>
                        {d.document_reference && (
                          <p className="text-xs text-muted-foreground mt-1">{d.document_reference}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Reusable collapsible section component
function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        {icon}
        <span className="font-semibold text-sm">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pt-3 pb-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <p className="text-sm mt-0.5">{value || <span className="text-muted-foreground italic">Not documented</span>}</p>
    </div>
  );
}
