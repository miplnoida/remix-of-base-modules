import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Send, Eye, Lock, Unlock } from 'lucide-react';
import { useIAAnnualPlans, useIAFindings, useIAManagementResponses } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ReportPreviewDialog } from '@/components/audit/ReportPreviewDialog';

export default function ReportBuilder() {
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState({ background: '', keyHighlights: '', overallAssessment: '', limitations: '', conclusion: '', followUpActions: '', distributionList: '' });

  const { data: plans = [] } = useIAAnnualPlans();
  const { data: findings = [] } = useIAFindings();
  const { data: responses = [] } = useIAManagementResponses();

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const plan = plans.find((p: any) => p.id === selectedPlanId) || plans[0];
  const planFindings = findings.filter((f: any) => f.plan_id === (plan?.id || ''));

  const handleSubmit = () => {
    toast({ title: "Report Submitted", description: "The audit report has been submitted for approval." });
    setShowPreview(false);
    setIsLocked(true);
  };

  const getRiskBadge = (risk: string) => {
    const colors: Record<string, string> = { High: 'bg-red-500', Medium: 'bg-yellow-500', Low: 'bg-green-500' };
    return <Badge className={colors[risk] || 'bg-gray-500'}>{risk}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Audit Report Builder</h1><p className="text-muted-foreground">Build and finalize audit reports | <Link to="/" className="text-blue-600 hover:underline ml-1">← Dashboard</Link></p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLocked(!isLocked)}>{isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}{isLocked ? 'Locked' : 'Unlock'}</Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}><Eye className="w-4 h-4 mr-2" />Preview</Button>
        </div>
      </div>

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
            <Card key={finding.id} className="border-l-4 border-l-red-500 mb-4">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="font-semibold">Finding {i+1}: {finding.title}</div>
                  {getRiskBadge(finding.risk_rating)}
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
        <div className="flex items-center justify-between"><span>Status</span><Badge className={isLocked ? 'bg-green-500' : 'bg-yellow-500'}>{isLocked ? 'Finalized' : 'Draft'}</Badge></div>
      </CardContent></Card>

      <ReportPreviewDialog open={showPreview} onOpenChange={setShowPreview} reportData={{
        title: plan?.title || '', fiscalYear: plan?.fiscal_year || '', reportDate: new Date().toLocaleDateString(),
        auditPeriod: '', preparedBy: 'Internal Audit', background: reportData.background, keyHighlights: reportData.keyHighlights,
        overallAssessment: reportData.overallAssessment, objective: plan?.objective || '', scope: plan?.scope || '',
        methodology: plan?.methodology || '', limitations: reportData.limitations, findings: planFindings, responses: [],
        conclusion: reportData.conclusion, followUpActions: reportData.followUpActions, reviewedBy: 'Manager Internal Audit',
        distributionList: reportData.distributionList
      }} onSubmit={handleSubmit} />
    </div>
  );
}
