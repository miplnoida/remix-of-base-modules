import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, Info, Database, Settings2, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { useScoreExplanations, useResourceRecommendations, useGenerateResourceRecommendations } from '@/hooks/useAutoPlanEngine';
import { useIAAuditors } from '@/hooks/useAuditData';

interface CandidateDetailPanelProps {
  candidate: any;
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REASON_LABELS: Record<string, string> = {
  HIGH_RISK: 'High Risk Score',
  OVERDUE_FREQUENCY: 'Overdue per Frequency Policy',
  NEVER_AUDITED: 'Never Audited',
  OPEN_FINDINGS: 'Open High/Critical Findings',
  OVERDUE_ACTIONS: 'Overdue Action Items',
  RECENT_CHANGES: 'Recent Organizational Changes',
};

function ScoreBar({ label, rawValue, normalizedValue, weight, contribution, color }: {
  label: string; rawValue?: string; normalizedValue: number; weight: number; contribution: number; color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex gap-3">
          {rawValue && <span className="text-muted-foreground/70">{rawValue}</span>}
          <span className="font-medium">{Math.round(normalizedValue)} × {weight} = <strong>{contribution.toFixed(1)}</strong></span>
        </div>
      </div>
      <Progress value={normalizedValue} className={`h-1.5 ${color}`} />
    </div>
  );
}

export function CandidateDetailPanel({ candidate, planId, open, onOpenChange }: CandidateDetailPanelProps) {
  const { data: explanations = [] } = useScoreExplanations(planId, candidate?.id);
  const { data: recommendations = [] } = useResourceRecommendations(planId, candidate?.id);
  const { data: auditors = [] } = useIAAuditors();
  const generateRecs = useGenerateResourceRecommendations(planId);

  const explanation = explanations[0]; // Latest for this candidate
  const getAuditorName = (id: string) => auditors.find((a: any) => a.id === id)?.name || id;

  const getRiskBadgeVariant = (score: number) => {
    if (score >= 75) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Candidate Detail & Explainability</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-4">
          <p className="font-medium text-sm">{candidate.entity_name}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{Math.round(candidate.composite_score)}</span>
            <StatusBadge status={getRiskBadgeVariant(candidate.composite_score)} />
            {candidate.is_overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
          </div>
          <div className="flex gap-1 flex-wrap">
            {(candidate.reason_codes || []).map((code: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">{REASON_LABELS[code] || code}</Badge>
            ))}
          </div>
        </div>

        <Tabs defaultValue="formula" className="space-y-3">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="formula" className="text-xs"><Info className="w-3 h-3 mr-1" />Formula</TabsTrigger>
            <TabsTrigger value="source" className="text-xs"><Database className="w-3 h-3 mr-1" />Source Data</TabsTrigger>
            <TabsTrigger value="params" className="text-xs"><Settings2 className="w-3 h-3 mr-1" />Parameters</TabsTrigger>
            <TabsTrigger value="resources" className="text-xs"><Users className="w-3 h-3 mr-1" />Resources</TabsTrigger>
          </TabsList>

          {/* Formula Breakdown */}
          <TabsContent value="formula" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Weighted Score Contribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ScoreBar
                  label="Risk Assessment"
                  rawValue={explanation ? `Raw: ${Math.round(explanation.raw_risk_score)}` : undefined}
                  normalizedValue={candidate.risk_score}
                  weight={explanation?.weight_risk || 0.35}
                  contribution={explanation?.contrib_risk || candidate.risk_score * 0.35}
                  color="[&>div]:bg-red-500"
                />
                <ScoreBar
                  label="Audit Recency"
                  rawValue={explanation?.raw_recency_months != null ? `${Math.round(explanation.raw_recency_months)} months` : 'Never'}
                  normalizedValue={candidate.recency_score}
                  weight={explanation?.weight_recency || 0.20}
                  contribution={explanation?.contrib_recency || candidate.recency_score * 0.20}
                  color="[&>div]:bg-amber-500"
                />
                <ScoreBar
                  label="Outstanding Findings"
                  rawValue={explanation ? `${explanation.raw_findings_count} open` : undefined}
                  normalizedValue={candidate.findings_score}
                  weight={explanation?.weight_findings || 0.15}
                  contribution={explanation?.contrib_findings || candidate.findings_score * 0.15}
                  color="[&>div]:bg-orange-500"
                />
                <ScoreBar
                  label="Overdue Follow-Ups"
                  rawValue={explanation ? `${explanation.raw_overdue_actions_count} overdue` : undefined}
                  normalizedValue={candidate.followup_score}
                  weight={explanation?.weight_followup || 0.10}
                  contribution={explanation?.contrib_followup || candidate.followup_score * 0.10}
                  color="[&>div]:bg-purple-500"
                />
                <ScoreBar
                  label="Compliance Frequency"
                  normalizedValue={candidate.compliance_score}
                  weight={explanation?.weight_compliance || 0.10}
                  contribution={explanation?.contrib_compliance || candidate.compliance_score * 0.10}
                  color="[&>div]:bg-blue-500"
                />
                <ScoreBar
                  label="Change Events"
                  rawValue={explanation ? `${explanation.raw_change_events_count} events` : undefined}
                  normalizedValue={candidate.change_score}
                  weight={explanation?.weight_change || 0.10}
                  contribution={explanation?.contrib_change || candidate.change_score * 0.10}
                  color="[&>div]:bg-emerald-500"
                />
                <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                  <span>Composite Score</span>
                  <span>{Math.round(candidate.composite_score)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Source Data */}
          <TabsContent value="source" className="space-y-3">
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-muted-foreground">Last Audit Date</div>
                  <div className="font-medium">
                    {candidate.last_audit_date ? formatDateForDisplay(candidate.last_audit_date) : 'Never audited'}
                  </div>
                  <div className="text-muted-foreground">Source</div>
                  <div className="font-medium">{explanation?.last_audit_source || '—'}</div>
                  <div className="text-muted-foreground">Risk Assessment ID</div>
                  <div className="font-medium text-xs font-mono">{explanation?.risk_assessment_id?.slice(0, 8) || '—'}</div>
                  <div className="text-muted-foreground">Risk Assessment Date</div>
                  <div className="font-medium">{explanation?.risk_assessment_date ? formatDateForDisplay(explanation.risk_assessment_date) : '—'}</div>
                  <div className="text-muted-foreground">Frequency Policy</div>
                  <div className="font-medium">Every {candidate.frequency_policy_months || '—'} months</div>
                  <div className="text-muted-foreground">Overdue Status</div>
                  <div>{candidate.is_overdue ? <Badge variant="destructive" className="text-[10px]">Overdue</Badge> : <Badge variant="secondary" className="text-[10px]">Within Cycle</Badge>}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parameters */}
          <TabsContent value="params" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Parameters Used in This Scoring Run</CardTitle>
              </CardHeader>
              <CardContent>
                {explanation?.parameter_versions ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Parameter</TableHead>
                        <TableHead className="text-xs">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(explanation.parameter_versions).map(([key, val]: [string, any]) => (
                        <TableRow key={key}>
                          <TableCell className="text-xs font-medium">{key.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-xs">{String(val)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">No parameter metadata available. Re-generate suggestions to capture parameter versions.</p>
                )}
                {explanation && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>Resolved Scope: <Badge variant="outline" className="text-[10px]">{explanation.resolved_scope || 'global'}</Badge></p>
                    <p className="mt-1">Generated: {explanation.generated_at ? new Date(explanation.generated_at).toLocaleString() : '—'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources */}
          <TabsContent value="resources" className="space-y-3">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateRecs.mutate(candidate.id)}
                disabled={generateRecs.isPending}
              >
                {generateRecs.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Users className="h-3 w-3 mr-1" />}
                Generate Recommendations
              </Button>
            </div>
            {recommendations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No resource recommendations yet. Click "Generate Recommendations" to analyze auditor fit.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Auditor</TableHead>
                    <TableHead className="text-xs">Fit Score</TableHead>
                    <TableHead className="text-xs">Availability</TableHead>
                    <TableHead className="text-xs">Conflicts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendations.slice(0, 5).map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-xs font-mono">{rec.recommendation_rank}</TableCell>
                      <TableCell className="text-xs font-medium">{getAuditorName(rec.auditor_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Progress value={rec.fit_score} className="h-1.5 w-16" />
                          <span className="text-xs">{Math.round(rec.fit_score)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {Math.round(rec.workload_hours_current)}h → {Math.round(rec.workload_hours_if_assigned)}h
                      </TableCell>
                      <TableCell>
                        {(rec.conflict_indicators || []).length > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{(rec.conflict_indicators || []).length}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">None</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
