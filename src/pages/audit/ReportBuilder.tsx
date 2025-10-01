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
import { auditPlans, findings, managementResponses } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function ReportBuilder() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState('plan-002');
  const [isLocked, setIsLocked] = useState(false);
  
  const plan = auditPlans.find(p => p.id === selectedPlan);
  const planFindings = findings.filter(f => f.planId === selectedPlan);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Report Builder</h1>
          <p className="text-muted-foreground">
            Build and finalize comprehensive audit reports |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLocked(!isLocked)}>
            {isLocked ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
            {isLocked ? 'Locked' : 'Unlock'}
          </Button>
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button>
            <Send className="w-4 h-4 mr-2" />
            Submit for Review
          </Button>
        </div>
      </div>

      {/* Report Sections */}
      <Tabs defaultValue="header" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
          <TabsTrigger value="scope">Scope & Methodology</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="conclusion">Conclusion</TabsTrigger>
        </TabsList>

        {/* Report Header */}
        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle>Report Header Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Report Title</Label>
                <Input 
                  defaultValue={plan?.title} 
                  disabled={isLocked}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fiscal Year</Label>
                  <Input defaultValue={plan?.fiscalYear} disabled={isLocked} />
                </div>
                <div>
                  <Label>Report Date</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} disabled={isLocked} />
                </div>
              </div>
              <div>
                <Label>Audit Period</Label>
                <Input 
                  defaultValue={`${plan?.plannedStart} to ${plan?.plannedEnd}`} 
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label>Prepared By</Label>
                <Input defaultValue="Internal Audit Department" disabled={isLocked} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executive Summary */}
        <TabsContent value="executive">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Background</Label>
                <Textarea 
                  rows={4}
                  placeholder="Provide background information about the audit..."
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label>Key Highlights</Label>
                <Textarea 
                  rows={4}
                  placeholder="Summarize key findings and observations..."
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label>Overall Assessment</Label>
                <Textarea 
                  rows={3}
                  placeholder="Provide an overall assessment of the audited area..."
                  disabled={isLocked}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scope & Methodology */}
        <TabsContent value="scope">
          <Card>
            <CardHeader>
              <CardTitle>Scope & Methodology</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Audit Objective</Label>
                <Textarea 
                  rows={3}
                  defaultValue={plan?.objective}
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label>Scope</Label>
                <Textarea 
                  rows={4}
                  defaultValue={plan?.scope}
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label>Methodology</Label>
                <Textarea 
                  rows={4}
                  defaultValue={plan?.methodology}
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label>Limitations (if any)</Label>
                <Textarea 
                  rows={2}
                  placeholder="Describe any limitations encountered during the audit..."
                  disabled={isLocked}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Findings */}
        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Findings ({planFindings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {planFindings.length > 0 ? (
                  planFindings.map((finding, index) => (
                    <Card key={finding.id} className="border-l-4 border-l-red-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Checkbox defaultChecked disabled={isLocked} />
                            <div>
                              <div className="font-semibold">Finding {index + 1}: {finding.title}</div>
                              <div className="text-sm text-muted-foreground">{finding.findingId}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={
                              finding.riskRating === 'High' ? 'bg-red-500' :
                              finding.riskRating === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }>
                              {finding.riskRating}
                            </Badge>
                            <Badge variant="outline">{finding.impactArea}</Badge>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><strong>Condition:</strong> {finding.condition}</div>
                          <div><strong>Criteria:</strong> {finding.criteria}</div>
                          <div><strong>Cause:</strong> {finding.cause}</div>
                          <div><strong>Effect:</strong> {finding.effect}</div>
                          <div><strong>Recommendation:</strong> {finding.recommendation}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No findings documented for this audit plan
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Responses */}
        <TabsContent value="responses">
          <Card>
            <CardHeader>
              <CardTitle>Management Responses & Action Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {managementResponses.map((response) => {
                  const finding = findings.find(f => f.id === response.findingId);
                  return (
                    <Card key={response.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div>
                            <strong>Finding:</strong> {finding?.findingId} - {finding?.title}
                          </div>
                          <div>
                            <strong>Management Response:</strong>
                            <p className="text-sm mt-1">{response.responseText}</p>
                          </div>
                          <div>
                            <strong>Action Plan:</strong>
                            <p className="text-sm mt-1 whitespace-pre-line">{response.actionPlan}</p>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div><strong>Responsible:</strong> {response.responsiblePerson}</div>
                            <div><strong>Target Date:</strong> {new Date(response.targetDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conclusion */}
        <TabsContent value="conclusion">
          <Card>
            <CardHeader>
              <CardTitle>Conclusion & Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Overall Conclusion</Label>
                <Textarea 
                  rows={4}
                  placeholder="Provide concluding remarks..."
                  disabled={isLocked}
                />
              </div>
              <div>
                <Label>Follow-up Actions</Label>
                <Textarea 
                  rows={3}
                  placeholder="Outline next steps and follow-up schedule..."
                  disabled={isLocked}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prepared By</Label>
                  <Input defaultValue="John Doe, Senior Auditor" disabled={isLocked} />
                </div>
                <div>
                  <Label>Reviewed By</Label>
                  <Input defaultValue="Manager Internal Audit" disabled={isLocked} />
                </div>
              </div>
              <div>
                <Label>Distribution List</Label>
                <Textarea 
                  rows={2}
                  placeholder="List recipients who will receive this report..."
                  disabled={isLocked}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Status */}
      <Card>
        <CardHeader>
          <CardTitle>Report Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Draft Version</span>
              <Badge>v1.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Last Modified</span>
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <Badge className={isLocked ? 'bg-green-500' : 'bg-yellow-500'}>
                {isLocked ? 'Finalized' : 'Draft'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
