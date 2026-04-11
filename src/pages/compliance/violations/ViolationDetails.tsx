import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Bell, DollarSign, History, AlertTriangle, Plus, AlertCircle, MessageSquare, Mail, ListChecks, Loader2 } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';
import { fetchCaseById, fetchCaseHistory, fetchNotices, fetchCasesByEmployer } from '@/services/complianceDataService';

export default function ViolationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [arrangements, setArrangements] = useState<ComponentPaymentArrangement[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: violationData, isLoading: loadingCase } = useQuery({
    queryKey: ['ce_case', id],
    queryFn: () => fetchCaseById(id!),
    enabled: !!id,
  });

  const { data: violationHistory = [] } = useQuery({
    queryKey: ['ce_case_history', id],
    queryFn: () => fetchCaseHistory(id!),
    enabled: !!id,
  });

  const { data: violationNotices = [] } = useQuery({
    queryKey: ['ce_notices', id],
    queryFn: () => fetchNotices({ caseId: id }),
    enabled: !!id,
  });

  const { data: otherViolations = [] } = useQuery({
    queryKey: ['ce_cases_employer', violationData?.employer_id, id],
    queryFn: () => fetchCasesByEmployer(violationData!.employer_id, id),
    enabled: !!violationData?.employer_id,
  });

  // Load arrangements
  useState(() => {
    if (id) {
      getArrangementsForCase(id).then(setArrangements);
    }
  });

  if (loadingCase) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  // Map DB columns to display
  const v = violationData as any;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`Violation: ${v.case_number}`}
        subtitle={v.employer_name}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Violations', href: '/compliance/violations' },
          { label: v.case_number }
        ]}
      />

      {/* Violation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{v.case_number}</CardTitle>
                <Badge className={getStatusColor(v.status)}>
                  {v.status}
                </Badge>
                <Badge variant="outline">{(v.stage || '').replace(/_/g, ' ')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Created: {formatDate(v.created_at)} | Last Activity: {v.last_activity_date ? formatDate(v.last_activity_date) : 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Outstanding Balance</div>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(Number(v.outstanding_balance) || 0)}
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
            <div className="text-xl font-bold">{formatCurrency(Number(v.principal_amount) || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Penalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(Number(v.penalty_amount) || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(Number(v.interest_amount) || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(Number(v.total_amount_due) || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(Number(v.amount_paid) || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview"><FileText className="h-4 w-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="notes"><MessageSquare className="h-4 w-4 mr-2" />Notes</TabsTrigger>
          <TabsTrigger value="correspondence"><Mail className="h-4 w-4 mr-2" />Correspondence</TabsTrigger>
          <TabsTrigger value="actions"><ListChecks className="h-4 w-4 mr-2" />Action Plan</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />History</TabsTrigger>
          <TabsTrigger value="notices"><Bell className="h-4 w-4 mr-2" />Notices ({violationNotices.length})</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="h-4 w-4 mr-2" />Financial</TabsTrigger>
          <TabsTrigger value="other-violations"><AlertCircle className="h-4 w-4 mr-2" />Other ({otherViolations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Violation Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Violation Type</div>
                <div className="text-base">{(v.case_type || '').replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Priority</div>
                <Badge variant={v.priority === 'URGENT' ? 'destructive' : 'default'}>{v.priority}</Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Employer</div>
                <div className="text-base">{v.employer_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Zone</div>
                <div className="text-base">{v.employer_zone || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Assigned Inspector</div>
                <div className="text-base">{v.assigned_inspector_name || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Assigned Date</div>
                <div className="text-base">{v.assigned_date ? formatDate(v.assigned_date) : 'N/A'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-base">{v.description || '-'}</div>
              </div>
              {v.linked_c3_periods && v.linked_c3_periods.length > 0 && (
                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-muted-foreground">Linked C3 Periods</div>
                  <div className="flex gap-2 mt-1">
                    {v.linked_c3_periods.map((period: string) => (
                      <Badge key={period} variant="outline">{period}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <ViolationNotesTab violationId={v.id} />
        </TabsContent>

        <TabsContent value="correspondence" className="space-y-4">
          <ViolationCorrespondenceTab
            violationId={v.id}
            employerId={v.employer_id}
            employerName={v.employer_name}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <ViolationActionPlanTab violationId={v.id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Violation Stage History</CardTitle></CardHeader>
            <CardContent>
              {violationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No history records</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violationHistory.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell>{h.performed_at ? formatDate(h.performed_at) : '-'}</TableCell>
                        <TableCell>{h.action || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(h.new_status || h.status)}>
                            {h.new_status || h.status || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>{h.performed_by_name || h.performed_by || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{h.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notices Issued</CardTitle>
                <Button size="sm"><Bell className="h-4 w-4 mr-2" />Issue Notice</Button>
              </div>
            </CardHeader>
            <CardContent>
              {violationNotices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No notices issued for this violation</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notice Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Delivery Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violationNotices.map((notice: any) => (
                      <TableRow key={notice.id}>
                        <TableCell className="font-medium">{notice.notice_number}</TableCell>
                        <TableCell>{(notice.notice_type || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell>{notice.issued_date ? formatDate(notice.issued_date) : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={notice.delivery_status === 'DELIVERED' ? 'default' : 'secondary'}>
                            {notice.delivery_status || '-'}
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
          <div className="grid gap-4 md:grid-cols-3">
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
          <Card>
            <CardHeader><CardTitle>Component-Level Financial Details</CardTitle></CardHeader>
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
                    <TableCell className="font-medium"><Badge className="bg-blue-100 text-blue-800 border-blue-300">SSC</Badge></TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.SSC]}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(4166.67)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(625.00)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(200.00)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(4991.67)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50/50">
                    <TableCell className="font-medium"><Badge className="bg-green-100 text-green-800 border-green-300">LVC</Badge></TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.LVC]}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(2800.00)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(420.00)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(140.00)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(3360.00)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-purple-50/50">
                    <TableCell className="font-medium"><Badge className="bg-purple-100 text-purple-800 border-purple-300">PEC</Badge></TableCell>
                    <TableCell className="text-sm">{COMPONENT_LABELS[ContributionComponent.PEC]}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(5000.00)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(750.00)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(250.00)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(6000.00)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2} className="text-right">Grand Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(v.principal_amount) || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(v.penalty_amount) || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(v.interest_amount) || 0)}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(Number(v.total_amount_due) || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other-violations" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Other Violations for {v.employer_name}</CardTitle></CardHeader>
            <CardContent>
              {otherViolations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No other violations for this employer</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherViolations.map((ov: any) => (
                      <TableRow key={ov.id}>
                        <TableCell className="font-medium">{ov.case_number}</TableCell>
                        <TableCell>{(ov.case_type || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell><Badge className={getStatusColor(ov.status)}>{ov.status}</Badge></TableCell>
                        <TableCell>{formatCurrency(Number(ov.outstanding_balance) || 0)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/violations/${ov.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
