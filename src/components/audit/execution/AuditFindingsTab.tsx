import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle, MessageSquare, CheckCircle, ChevronDown, ChevronUp, FileText, ClipboardCheck } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import { useIAFindingMutations } from '@/hooks/useAuditData';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { useToast } from '@/hooks/use-toast';
import { formatDateForDisplay } from '@/lib/format-config';

interface AuditFindingsTabProps {
  auditId: string;
  auditFindings: any[];
  auditResponses: any[];
  auditActions: any[];
  departmentId?: string;
}

export function AuditFindingsTab({ auditId, auditFindings, auditResponses, auditActions, departmentId }: AuditFindingsTabProps) {
  const { create } = useIAFindingMutations();
  const { getCreateFields } = useAuditFields();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: 'Medium', recommendation: '' });

  const handleCreate = () => {
    if (!form.title || !form.condition) {
      toast({ title: 'Validation', description: 'Title and Condition are required', variant: 'destructive' });
      return;
    }
    const findingId = `FND-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({
      ...form, finding_id: findingId, engagement_id: auditId, department_id: departmentId || null,
      activity_id: null, annual_plan_id: null, status: 'Draft', ...getCreateFields(),
    } as any, {
      onSuccess: () => { setShowForm(false); setForm({ title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: 'Medium', recommendation: '' }); },
    });
  };

  const getLinkedResponses = (findingId: string) => auditResponses.filter((r: any) => r.finding_id === findingId);
  const getLinkedActions = (findingId: string) => auditActions.filter((a: any) => a.finding_id === findingId);

  const riskColor = (risk: string) => {
    if (risk === 'Critical') return 'border-l-red-900';
    if (risk === 'High') return 'border-l-destructive';
    if (risk === 'Medium') return 'border-l-amber-500';
    return 'border-l-emerald-500';
  };

  // Stats
  const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  auditFindings.forEach((f: any) => { if (f.risk_rating && riskCounts[f.risk_rating as keyof typeof riskCounts] !== undefined) riskCounts[f.risk_rating as keyof typeof riskCounts]++; });

  return (
    <div className="space-y-4">
      {/* Stats */}
      {auditFindings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(riskCounts).map(([risk, count]) => (
            <div key={risk} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-background">
              <StatusBadge status={risk} />
              <span className="text-sm font-bold">{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{auditFindings.length} finding(s)</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />New Finding</Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Risk Rating</Label>
                <Select value={form.risk_rating} onValueChange={v => setForm(f => ({ ...f, risk_rating: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Critical', 'High', 'Medium', 'Low'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Condition *</Label><Textarea value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} rows={2} placeholder="What was found" /></div>
              <div><Label>Criteria</Label><Textarea value={form.criteria} onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))} rows={2} placeholder="What should be" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cause</Label><Textarea value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))} rows={2} placeholder="Why it happened" /></div>
              <div><Label>Effect</Label><Textarea value={form.effect} onChange={e => setForm(f => ({ ...f, effect: e.target.value }))} rows={2} placeholder="Impact / consequence" /></div>
            </div>
            <div><Label>Recommendation</Label><Textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={create.isPending}>Create Finding</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings List - Card-based with expand for linked data */}
      {auditFindings.length === 0 && !showForm ? (
        <AuditEmptyState icon={AlertTriangle} title="No findings documented" description="Document audit issues found during fieldwork" actionLabel="Add Finding" onAction={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {auditFindings.map((finding: any, idx: number) => {
            const responses = getLinkedResponses(finding.id);
            const actions = getLinkedActions(finding.id);
            const isExpanded = expandedId === finding.id;
            const hasResponse = responses.length > 0;
            const hasActions = actions.length > 0;

            return (
              <Card key={finding.id} className={`border-l-4 ${riskColor(finding.risk_rating || 'Medium')} hover:shadow-sm transition-shadow`}>
                <CardContent className="p-4">
                  {/* Finding Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{finding.finding_id || `#${idx + 1}`}</span>
                        <StatusBadge status={finding.risk_rating || 'Medium'} />
                        <StatusBadge status={finding.status || 'Draft'} />
                      </div>
                      <h4 className="text-sm font-semibold">{finding.title}</h4>
                      {finding.condition && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{finding.condition}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status indicators */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span title="Responses" className={`flex items-center gap-0.5 ${hasResponse ? 'text-primary' : ''}`}>
                          <MessageSquare className="h-3.5 w-3.5" />{responses.length}
                        </span>
                        <span title="Actions" className={`flex items-center gap-0.5 ${hasActions ? 'text-emerald-600' : ''}`}>
                          <CheckCircle className="h-3.5 w-3.5" />{actions.length}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedId(isExpanded ? null : finding.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-border/30">
                      {/* Criteria / Condition / Cause / Effect grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {finding.criteria && <DetailBlock label="Criteria" value={finding.criteria} />}
                        {finding.condition && <DetailBlock label="Condition" value={finding.condition} />}
                        {finding.cause && <DetailBlock label="Cause" value={finding.cause} />}
                        {finding.effect && <DetailBlock label="Effect" value={finding.effect} />}
                      </div>
                      {finding.recommendation && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-xs font-medium text-primary mb-1">Recommendation</p>
                          <p className="text-sm leading-relaxed">{finding.recommendation}</p>
                        </div>
                      )}

                      {/* Linked Responses */}
                      {responses.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><MessageSquare className="h-3 w-3" />Management Responses ({responses.length})</p>
                          {responses.map((r: any) => (
                            <div key={r.id} className="p-3 rounded-lg border border-border/50 mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <StatusBadge status={r.status || 'Pending'} />
                                <span className="text-xs text-muted-foreground">{r.submitted_date ? formatDateForDisplay(r.submitted_date) : ''}</span>
                              </div>
                              <p className="text-sm">{r.response_text}</p>
                              {r.action_plan && <p className="text-xs text-muted-foreground mt-1">Action Plan: {r.action_plan}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Linked Actions */}
                      {actions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Corrective Actions ({actions.length})</p>
                          <div className="space-y-2">
                            {actions.map((a: any) => {
                              const isOverdue = a.target_date && !['Completed', 'Closed'].includes(a.status || '') && new Date(a.target_date) < new Date();
                              return (
                                <div key={a.id} className={`p-3 rounded-lg border ${isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border/50'}`}>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm">{a.action_description}</p>
                                    <div className="flex items-center gap-1.5">
                                      <StatusBadge status={a.status || 'Open'} />
                                      {isOverdue && <StatusBadge status="Overdue" />}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {a.responsible_person && <span>Assigned: {a.responsible_person}</span>}
                                    {a.target_date && <span>Due: {formatDateForDisplay(a.target_date)}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!hasResponse && !hasActions && (
                        <p className="text-xs text-muted-foreground italic">No responses or actions linked yet.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/50 border border-border/30">
      <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm leading-relaxed">{value}</p>
    </div>
  );
}
