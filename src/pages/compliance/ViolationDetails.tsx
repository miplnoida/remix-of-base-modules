import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Bell, DollarSign, History, AlertTriangle, Plus, AlertCircle, MessageSquare, Mail, ListChecks } from 'lucide-react';
import { MOCK_CASES, MOCK_CASE_HISTORY, MOCK_NOTICES } from '@/services/mockData/complianceData';
import { CaseStatus } from '@/types/compliance';
import { ContributionComponent, COMPONENT_LABELS } from '@/types/contributionComponents';
import { ComponentPaymentArrangement } from '@/types/paymentArrangement';
import { getArrangementsForCase, createPaymentArrangement } from '@/services/paymentArrangementService';
import { CreateArrangementDialog } from '@/components/compliance/CreateArrangementDialog';
import { ArrangementDetailsCard } from '@/components/compliance/ArrangementDetailsCard';
import { ViolationNotesTab } from '@/components/compliance/ViolationNotesTab';
import { ViolationCorrespondenceTab } from '@/components/compliance/ViolationCorrespondenceTab';
import { ViolationActionPlanTab } from '@/components/compliance/ViolationActionPlanTab';
import { toast } from 'sonner';

export default function ViolationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [arrangements, setArrangements] = useState<ComponentPaymentArrangement[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const violationData = MOCK_CASES.find(c => c.id === id);
  const violationHistory = MOCK_CASE_HISTORY.filter(h => h.caseId === id);
  const violationNotices = MOCK_NOTICES.filter(n => n.caseId === id);

  // Load arrangements
  useEffect(() => {
    if (id) {
      getArrangementsForCase(id).then(setArrangements);
    }
  }, [id]);

  // Get other violations for the same employer
  const otherViolations = violationData 
    ? MOCK_CASES.filter(c => c.employerId === violationData.employerId && c.id !== id)
    : [];

  if (!violationData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Violation not found</h2>
          <Button onClick={() => navigate('/compliance/violations')} className="mt-4">
            Back to Violations
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: CaseStatus) => {
    const colors: Record<CaseStatus, string> = {
      [CaseStatus.OPEN]: 'bg-blue-100 text-blue-800',
      [CaseStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [CaseStatus.ON_HOLD]: 'bg-yellow-100 text-yellow-800',
      [CaseStatus.ARRANGEMENT_ACTIVE]: 'bg-purple-100 text-purple-800',
      [CaseStatus.ESCALATED_LEGAL]: 'bg-red-100 text-red-800',
      [CaseStatus.COMPLETED]: 'bg-teal-100 text-teal-800',
      [CaseStatus.CLOSED_NO_ACTION]: 'bg-gray-100 text-gray-800',
      [CaseStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
      [CaseStatus.ARCHIVED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`Violation: ${violationData.caseNumber}`}
        subtitle={violationData.employerName}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Violations', href: '/compliance/violations' },
          { label: violationData.caseNumber }
        ]}
      />

      {/* Violation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{violationData.caseNumber}</CardTitle>
                <Badge className={getStatusColor(violationData.caseStatus)}>
                  {violationData.caseStatus}
                </Badge>
                <Badge variant="outline">{violationData.caseStage.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Created: {formatDate(violationData.createdDate)} | Last Activity: {formatDate(violationData.lastActivityDate)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Outstanding Balance</div>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(violationData.outstandingBalance)}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Principal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(violationData.principalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Penalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(violationData.penaltyAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(violationData.interestAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(violationData.totalAmountDue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(violationData.amountPaid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="notes">
            <MessageSquare className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="correspondence">
            <Mail className="h-4 w-4 mr-2" />
            Correspondence
          </TabsTrigger>
          <TabsTrigger value="actions">
            <ListChecks className="h-4 w-4 mr-2" />
            Action Plan
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="notices">
            <Bell className="h-4 w-4 mr-2" />
            Notices ({violationNotices.length})
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="other-violations">
            <AlertCircle className="h-4 w-4 mr-2" />
            Other ({otherViolations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Violation Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Violation Type</div>
                <div className="text-base">{violationData.caseType.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Priority</div>
                <Badge variant={violationData.priority === 'URGENT' ? 'destructive' : 'default'}>
                  {violationData.priority}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Employer</div>
                <div className="text-base">{violationData.employerName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Zone</div>
                <div className="text-base">{violationData.employerZone}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Assigned Inspector</div>
                <div className="text-base">{violationData.assignedInspectorName || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Assigned Date</div>
                <div className="text-base">{violationData.assignedDate ? formatDate(violationData.assignedDate) : 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-base">{violationData.description}</div>
              </div>
              {violationData.linkedC3Periods && violationData.linkedC3Periods.length > 0 && (
                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-muted-foreground">Linked C3 Periods</div>
                  <div className="flex gap-2 mt-1">
                    {violationData.linkedC3Periods.map(period => (
                      <Badge key={period} variant="outline">{period}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <ViolationNotesTab violationId={violationData.id} />
        </TabsContent>

        <TabsContent value="correspondence" className="space-y-4">
          <ViolationCorrespondenceTab 
            violationId={violationData.id}
            employerId={violationData.employerId}
            employerName={violationData.employerName}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <ViolationActionPlanTab violationId={violationData.id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Violation Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From Stage</TableHead>
                    <TableHead>To Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violationHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>{formatDate(history.changedDate)}</TableCell>
                      <TableCell>{history.fromStage?.replace(/_/g, ' ') || 'N/A'}</TableCell>
                      <TableCell>{history.toStage.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(history.toStatus)}>
                          {history.toStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{history.changedByName}</TableCell>
                      <TableCell className="max-w-xs truncate">{history.reason || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notices Issued</CardTitle>
                <Button size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Issue Notice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {violationNotices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notices issued for this violation
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notice Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Delivery Status</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violationNotices.map((notice) => (
                      <TableRow key={notice.id}>
                        <TableCell className="font-medium">{notice.noticeNumber}</TableCell>
                        <TableCell>{notice.noticeType.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{formatDate(notice.issuedDate)}</TableCell>
                        <TableCell>
                          <Badge variant={notice.deliveryStatus === 'DELIVERED' ? 'default' : 'secondary'}>
                            {notice.deliveryStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={notice.responseReceived ? 'default' : 'secondary'}>
                            {notice.responseReceived ? 'Received' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          {/* Component-Level Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Social Security Components */}
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">Social Security</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">SSC - Contributions</div>
                  <div className="text-base font-semibold">{formatCurrency(4166.67)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">SSF - Penalties</div>
                  <div className="text-base font-semibold">{formatCurrency(1250.00)}</div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Subtotal</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(5416.67)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Levy Components */}
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 border-green-300">Levy</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">LVC - Contributions</div>
                  <div className="text-base font-semibold">{formatCurrency(2800.00)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">LVF - Penalties</div>
                  <div className="text-base font-semibold">{formatCurrency(700.00)}</div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Subtotal</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(3500.00)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Severance Components */}
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800 border-purple-300">Severance</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">PEC - Contributions</div>
                  <div className="text-base font-semibold">{formatCurrency(5000.00)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">PEF - Penalties</div>
                  <div className="text-base font-semibold">{formatCurrency(1500.00)}</div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Subtotal</div>
                  <div className="text-lg font-bold text-purple-600">{formatCurrency(6500.00)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Component Table */}
          <Card>
            <CardHeader>
              <CardTitle>Component-Level Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Penalty</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50/50">
                    <TableCell className="font-medium">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">SSC</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.SSC]}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(4166.67)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">{formatCurrency(41.67)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(4208.34)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-50/30">
                    <TableCell className="font-medium">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">SSF</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.SSF]}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(1250.00)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(1250.00)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50/50">
                    <TableCell className="font-medium">
                      <Badge className="bg-green-100 text-green-800 border-green-300">LVC</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.LVC]}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(2800.00)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">{formatCurrency(56.00)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(2856.00)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50/30">
                    <TableCell className="font-medium">
                      <Badge className="bg-green-100 text-green-800 border-green-300">LVF</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.LVF]}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(700.00)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(700.00)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-purple-50/50">
                    <TableCell className="font-medium">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">PEC</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.PEC]}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(5000.00)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">{formatCurrency(75.00)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(5075.00)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-purple-50/30">
                    <TableCell className="font-medium">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">PEF</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.PEF]}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(1500.00)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(1500.00)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(violationData.principalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(violationData.penaltyAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(violationData.interestAmount)}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(violationData.totalAmountDue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex justify-between items-center pb-2 border-b font-semibold">
                  <span>Total Amount Due</span>
                  <span>{formatCurrency(violationData.totalAmountDue)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b text-green-600">
                  <span>Amount Paid</span>
                  <span className="font-medium">{formatCurrency(violationData.amountPaid)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-destructive">
                  <span>Outstanding Balance</span>
                  <span>{formatCurrency(violationData.outstandingBalance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other-violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Other Violations for {violationData.employerName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                View all other violations and amounts due for this employer
              </p>
            </CardHeader>
            <CardContent>
              {otherViolations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No other violations found for this employer
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Other Violations</div>
                        <div className="text-2xl font-bold">{otherViolations.length}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Outstanding</div>
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(otherViolations.reduce((sum, v) => sum + v.outstandingBalance, 0))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Active Violations</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {otherViolations.filter(v => v.caseStatus === CaseStatus.ACTIVE).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Violations Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Violation Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherViolations.map((violation) => (
                        <TableRow key={violation.id}>
                          <TableCell className="font-medium">{violation.caseNumber}</TableCell>
                          <TableCell>{violation.caseType.replace(/_/g, ' ')}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(violation.caseStatus)}>
                              {violation.caseStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{violation.caseStage.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(violation.outstandingBalance)}
                          </TableCell>
                          <TableCell>{formatDate(violation.createdDate)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/compliance/violations/${violation.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Arrangement Dialog */}
      {violationData && (
        <CreateArrangementDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          caseId={violationData.id}
          employerId={violationData.employerId}
          componentBreakdown={[
            { component: ContributionComponent.SSC, principalAmount: 4166.67, penaltyAmount: 0, interestAmount: 83.33, totalAmount: 4250.00 },
            { component: ContributionComponent.SSF, principalAmount: 0, penaltyAmount: 1250.00, interestAmount: 0, totalAmount: 1250.00 },
            { component: ContributionComponent.LVC, principalAmount: 2800.00, penaltyAmount: 0, interestAmount: 56.00, totalAmount: 2856.00 },
            { component: ContributionComponent.LVF, principalAmount: 0, penaltyAmount: 700.00, interestAmount: 0, totalAmount: 700.00 },
          ]}
          onSubmit={async (arrangementData) => {
            try {
              const newArrangement = await createPaymentArrangement(arrangementData);
              setArrangements(prev => [...prev, newArrangement]);
              toast.success('Payment arrangement created successfully');
            } catch (error) {
              toast.error('Failed to create payment arrangement');
            }
          }}
        />
      )}
    </div>
  );
}
