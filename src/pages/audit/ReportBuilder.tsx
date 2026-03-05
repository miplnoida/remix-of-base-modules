import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Lock, Unlock, Save } from 'lucide-react';
import { useIAAnnualPlans, useIAFindings, useIAManagementResponses } from '@/hooks/useAuditData';
import { useIAAuditReports, useIAAuditReportMutations } from '@/hooks/useAuditReports';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageShell, StatusBadge } from '@/components/common';
import { ReportPreviewDialog } from '@/components/audit/ReportPreviewDialog';

export default function ReportBuilder() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState({ background: '', keyHighlights: '', overallAssessment: '', limitations: '', conclusion: '', followUpActions: '', distributionList: '' });

  const { data: plans = [] } = useIAAnnualPlans();
  const { data: findings = [] } = useIAFindings();
  const { data: responses = [] } = useIAManagementResponses();
  const { data: reports = [] } = useIAAuditReports();
  const { create, update } = useIAAuditReportMutations();

  const [selectedReportId, setSelectedReportId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const selectedReport = reports.find((r: any) => r.id === selectedReportId);
  const isLocked = selectedReport?.status === 'Final' || selectedReport?.status === 'Submitted';
  const plan = plans.find((p: any) => p.id === (selectedReport?.plan_id || selectedPlanId)) || plans[0];
  const planFindings = findings.filter((f: any) => f.plan_id === (plan?.id || '') || f.annual_plan_id === (plan?.id || ''));

  // Load report data when selected report changes
  useEffect(() => {
    if (selectedReport) {
      setReportData({
        background: selectedReport.background || '',
        keyHighlights: selectedReport.key_highlights || '',
        overallAssessment: selectedReport.overall_assessment || '',
        limitations: selectedReport.limitations || '',
        conclusion: selectedReport.conclusion || '',
        followUpActions: selectedReport.follow_up_actions || '',
        distributionList: selectedReport.distribution_list || '',
      });
      setSelectedPlanId(selectedReport.plan_id || '');
    }
  }, [selectedReportId, selectedReport]);

  const handleSave = () => {
    if (selectedReport) {
      update.mutate({
        id: selectedReport.id,
        background: reportData.background,
        key_highlights: reportData.keyHighlights,
        overall_assessment: reportData.overallAssessment,
        limitations: reportData.limitations,
        conclusion: reportData.conclusion,
        follow_up_actions: reportData.followUpActions,
        distribution_list: reportData.distributionList,
        plan_id: selectedPlanId || null,
      });
    } else {
      create.mutate({
        title: plan?.title || 'Untitled Report',
        report_type: 'Plan Summary',
        fiscal_year: plan?.fiscal_year || new Date().getFullYear().toString(),
        plan_id: selectedPlanId || plan?.id || null,
        background: reportData.background,
        key_highlights: reportData.keyHighlights,
        overall_assessment: reportData.overallAssessment,
        limitations: reportData.limitations,
        conclusion: reportData.conclusion,
        follow_up_actions: reportData.followUpActions,
        distribution_list: reportData.distributionList,
        status: 'Draft',
      }, {
        onSuccess: (data: any) => {
          setSelectedReportId(data.id);
        }
      });
    }
  };

  const handleSubmit = () => {
    if (selectedReport) {
      update.mutate({ id: selectedReport.id, status: 'Submitted', submitted_on: new Date().toISOString() });
    }
    setShowPreview(false);
    toast({ title: "Report Submitted", description: "The audit report has been submitted for approval." });
  };

  return (
    <PageShell
      title="Audit Report Builder"
      subtitle="Build and finalize audit reports"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Report Builder' }]}
      actions={
        <div className="flex gap-2">
          {reports.length > 0 && (
            <Select value={selectedReportId} onValueChange={setSelectedReportId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select report" /></SelectTrigger>
              <SelectContent>{reports.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {plans.length > 0 && (
            <Select value={selectedPlanId || plan?.id || ''} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleSave} disabled={isLocked}>
            <Save className="w-4 h-4 mr-2" />Save
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}><Eye className="w-4 h-4 mr-2" />Preview</Button>
        </div>
      }
    >
      {!plan && !selectedReport ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground py-12">Select or create an annual audit plan to start building a report.</CardContent></Card>
      ) : (
        <>
          <Tabs defaultValue="executive" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="executive">Executive Summary</TabsTrigger>
              <TabsTrigger value="scope">Scope & Methodology</TabsTrigger>
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="conclusion">Conclusion</TabsTrigger>
            </TabsList>

            <TabsContent value="executive"><Card><CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader><CardContent className="space-y-4">
              <div><Label>Background</Label><Textarea rows={4} disabled={isLocked} value={reportData.background} onChange={(e) => setReportData({...reportData, background: e.target.value})} /></div>
              <div><Label>Key Highlights</Label><Textarea rows={4} disabled={isLocked} value={reportData.keyHighlights} onChange={(e) => setReportData({...reportData, keyHighlights: e.target.value})} /></div>
              <div><Label>Overall Assessment</Label><Textarea rows={3} disabled={isLocked} value={reportData.overallAssessment} onChange={(e) => setReportData({...reportData, overallAssessment: e.target.value})} /></div>
            </CardContent></Card></TabsContent>

            <TabsContent value="scope"><Card><CardHeader><CardTitle>Scope & Methodology</CardTitle></CardHeader><CardContent className="space-y-4">
              <div><Label>Objective</Label><Textarea rows={3} defaultValue={plan?.objective} disabled={isLocked} /></div>
              <div><Label>Scope</Label><Textarea rows={4} defaultValue={plan?.scope} disabled={isLocked} /></div>
              <div><Label>Methodology</Label><Textarea rows={4} defaultValue={plan?.methodology} disabled={isLocked} /></div>
            </CardContent></Card></TabsContent>

            <TabsContent value="findings"><Card><CardHeader><CardTitle>Findings ({planFindings.length})</CardTitle></CardHeader><CardContent>
              {planFindings.length > 0 ? planFindings.map((finding: any, i: number) => (
                <Card key={finding.id} className="border-l-4 border-l-destructive mb-4">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="font-semibold">Finding {i+1}: {finding.title}</div>
                      <StatusBadge status={finding.risk_rating} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><strong>Condition:</strong> {finding.condition}</div>
                      <div><strong>Criteria:</strong> {finding.criteria}</div>
                      <div><strong>Cause:</strong> {finding.cause}</div>
                      <div><strong>Effect:</strong> {finding.effect}</div>
                    </div>
                  </CardContent>
                </Card>
              )) : <p className="text-center py-8 text-muted-foreground">No findings for this plan</p>}
            </CardContent></Card></TabsContent>

            <TabsContent value="conclusion"><Card><CardHeader><CardTitle>Conclusion</CardTitle></CardHeader><CardContent className="space-y-4">
              <div><Label>Conclusion</Label><Textarea rows={4} disabled={isLocked} value={reportData.conclusion} onChange={(e) => setReportData({...reportData, conclusion: e.target.value})} /></div>
              <div><Label>Follow-up Actions</Label><Textarea rows={3} disabled={isLocked} value={reportData.followUpActions} onChange={(e) => setReportData({...reportData, followUpActions: e.target.value})} /></div>
              <div><Label>Distribution List</Label><Textarea rows={2} disabled={isLocked} value={reportData.distributionList} onChange={(e) => setReportData({...reportData, distributionList: e.target.value})} /></div>
            </CardContent></Card></TabsContent>
          </Tabs>

          <Card><CardHeader><CardTitle>Report Status</CardTitle></CardHeader><CardContent>
            <div className="flex items-center justify-between"><span>Status</span><StatusBadge status={selectedReport?.status || 'Draft'} /></div>
          </CardContent></Card>
        </>
      )}

      <ReportPreviewDialog open={showPreview} onOpenChange={setShowPreview} reportData={{
        title: selectedReport?.title || plan?.title || '', fiscalYear: selectedReport?.fiscal_year || plan?.fiscal_year || '', reportDate: new Date().toLocaleDateString(),
        auditPeriod: '', preparedBy: selectedReport?.prepared_by || 'Internal Audit', background: reportData.background, keyHighlights: reportData.keyHighlights,
        overallAssessment: reportData.overallAssessment, objective: plan?.objective || '', scope: plan?.scope || '',
        methodology: plan?.methodology || '', limitations: reportData.limitations, findings: planFindings, responses: [],
        conclusion: reportData.conclusion, followUpActions: reportData.followUpActions, reviewedBy: selectedReport?.reviewed_by || 'Manager Internal Audit',
        distributionList: reportData.distributionList
      }} onSubmit={handleSubmit} />
    </PageShell>
  );
}
