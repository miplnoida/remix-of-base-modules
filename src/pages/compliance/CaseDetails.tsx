import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Bell, DollarSign, History, AlertTriangle } from 'lucide-react';
import { MOCK_CASES, MOCK_CASE_HISTORY, MOCK_NOTICES } from '@/services/mockData/complianceData';
import { CaseStatus } from '@/types/compliance';

export default function CaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const caseData = MOCK_CASES.find(c => c.id === id);
  const caseHistory = MOCK_CASE_HISTORY.filter(h => h.caseId === id);
  const caseNotices = MOCK_NOTICES.filter(n => n.caseId === id);

  if (!caseData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Case not found</h2>
          <Button onClick={() => navigate('/compliance/cases')} className="mt-4">
            Back to Cases
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
        title={`Case: ${caseData.caseNumber}`}
        subtitle={caseData.employerName}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Cases', href: '/compliance/cases' },
          { label: caseData.caseNumber }
        ]}
      />

      {/* Case Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{caseData.caseNumber}</CardTitle>
                <Badge className={getStatusColor(caseData.caseStatus)}>
                  {caseData.caseStatus}
                </Badge>
                <Badge variant="outline">{caseData.caseStage.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Created: {formatDate(caseData.createdDate)} | Last Activity: {formatDate(caseData.lastActivityDate)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Outstanding Balance</div>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(caseData.outstandingBalance)}
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
            <div className="text-xl font-bold">{formatCurrency(caseData.principalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Penalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(caseData.penaltyAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(caseData.interestAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(caseData.totalAmountDue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(caseData.amountPaid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Stage History
          </TabsTrigger>
          <TabsTrigger value="notices">
            <Bell className="h-4 w-4 mr-2" />
            Notices ({caseNotices.length})
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Case Type</div>
                <div className="text-base">{caseData.caseType.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Priority</div>
                <Badge variant={caseData.priority === 'URGENT' ? 'destructive' : 'default'}>
                  {caseData.priority}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Employer</div>
                <div className="text-base">{caseData.employerName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Zone</div>
                <div className="text-base">{caseData.employerZone}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Assigned Inspector</div>
                <div className="text-base">{caseData.assignedInspectorName || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Assigned Date</div>
                <div className="text-base">{caseData.assignedDate ? formatDate(caseData.assignedDate) : 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-base">{caseData.description}</div>
              </div>
              {caseData.linkedC3Periods && caseData.linkedC3Periods.length > 0 && (
                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-muted-foreground">Linked C3 Periods</div>
                  <div className="flex gap-2 mt-1">
                    {caseData.linkedC3Periods.map(period => (
                      <Badge key={period} variant="outline">{period}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Stage History</CardTitle>
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
                  {caseHistory.map((history) => (
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
              {caseNotices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notices issued for this case
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
                    {caseNotices.map((notice) => (
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
          <Card>
            <CardHeader>
              <CardTitle>Financial Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Principal Amount</span>
                  <span className="font-medium">{formatCurrency(caseData.principalAmount)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Penalty Amount</span>
                  <span className="font-medium">{formatCurrency(caseData.penaltyAmount)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Interest Amount</span>
                  <span className="font-medium">{formatCurrency(caseData.interestAmount)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b font-semibold">
                  <span>Total Amount Due</span>
                  <span>{formatCurrency(caseData.totalAmountDue)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b text-green-600">
                  <span>Amount Paid</span>
                  <span className="font-medium">{formatCurrency(caseData.amountPaid)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-destructive">
                  <span>Outstanding Balance</span>
                  <span>{formatCurrency(caseData.outstandingBalance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
