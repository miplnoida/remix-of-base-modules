import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MockCase } from "@/data/mockLegalCases";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Calendar, FileText, Plus, AlertTriangle, Upload, Download } from "lucide-react";
import { RecordPaymentDialog } from "@/components/legal/RecordPaymentDialog";
import { AddCostDialog } from "@/components/legal/AddCostDialog";
import { ExcelImportWizard } from "@/pages/legal/ExcelImportWizard";
import { toast } from "sonner";

interface CaseFinancialsTabProps {
  caseData: MockCase;
}

interface PeriodOwed {
  id: string;
  periodFrom: string;
  periodTo: string;
  amount: number;
  type: 'current' | 'arrears';
  isEstimated: boolean;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  appliedPeriodId?: string;
  method: string;
}

interface Cost {
  id: string;
  stage: string;
  amount: number;
  date: string;
  note?: string;
}

interface Arrangement {
  id: string;
  terms: string;
  months: number;
  startDate: string;
  status: 'Active' | 'Defaulted' | 'Completed';
}

interface Waiver {
  id: string;
  type: 'penalty5k';
  percent: number;
  approvedBy: string;
  date: string;
}

export function CaseFinancialsTab({ caseData }: CaseFinancialsTabProps) {
  // Mock data - in real app, fetch from adapter
  const [periodsOwed] = useState<PeriodOwed[]>([
    { id: 'p1', periodFrom: '2023-01', periodTo: '2023-03', amount: 15000, type: 'arrears', isEstimated: false },
    { id: 'p2', periodFrom: '2023-04', periodTo: '2023-06', amount: 12000, type: 'arrears', isEstimated: true },
    { id: 'p3', periodFrom: '2023-07', periodTo: '2023-09', amount: 10000, type: 'current', isEstimated: false },
    { id: 'p4', periodFrom: '2023-10', periodTo: '2023-12', amount: 8200, type: 'current', isEstimated: false },
  ]);

  const [payments] = useState<Payment[]>([
    { id: 'pay1', date: '2024-01-15', amount: 5000, appliedPeriodId: 'p1', method: 'Wire Transfer' },
    { id: 'pay2', date: '2024-02-20', amount: 3000, appliedPeriodId: 'p1', method: 'Check' },
  ]);

  const [costs] = useState<Cost[]>([
    { id: 'c1', stage: 'Filing', amount: 500, date: '2024-01-15', note: 'Initial filing fee' },
    { id: 'c2', stage: 'Service', amount: 150, date: '2024-01-20', note: 'Service of summons' },
    { id: 'c3', stage: 'Appearance', amount: 300, date: '2024-03-01', note: 'First court appearance' },
  ]);

  const [arrangement] = useState<Arrangement | null>({
    id: 'arr1',
    terms: 'Payment of $2,000 per month for 24 months',
    months: 24,
    startDate: '2024-04-01',
    status: 'Active'
  });

  const [waiver] = useState<Waiver | null>({
    id: 'w1',
    type: 'penalty5k',
    percent: 50,
    approvedBy: 'Director Legal',
    date: '2024-03-15'
  });

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState<'arrears' | 'payments' | 'costs'>('arrears');

  // Calculate totals
  const totalOwed = periodsOwed.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
  const penaltyBase = 5000;
  const waiverAmount = waiver ? (penaltyBase * waiver.percent) / 100 : 0;
  const totalAssessed = totalOwed + totalCosts + (penaltyBase - waiverAmount);
  const outstanding = totalAssessed - totalPaid;

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPeriod = (from: string, to: string) => from === to ? from : `${from} to ${to}`;

  const handleExport = async () => {
    try {
      // In real app, call reportingAdapter.exportCaseFinancials
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Financial records exported successfully');
    } catch (error) {
      toast.error('Failed to export records');
    }
  };

  const handleImportComplete = () => {
    toast.success('Import completed successfully');
    // In real app, refresh financial data
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Financials</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setImportType('arrears'); setImportOpen(true); }}>
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assessed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {formatCurrency(totalAssessed)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Contributions + Costs + Penalty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(outstanding)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {((totalPaid / totalAssessed) * 100).toFixed(1)}% collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Court Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {formatCurrency(totalCosts)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {costs.length} stage{costs.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Arrangement Banner */}
      {arrangement && arrangement.status === 'Active' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Active Payment Arrangement</h3>
                <p className="text-sm text-blue-700 mt-1">{arrangement.terms}</p>
                <p className="text-xs text-blue-600 mt-1">Started: {arrangement.startDate}</p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiver Banner */}
      {waiver && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Penalty Waiver Applied</h3>
                <p className="text-sm text-amber-700 mt-1">
                  {waiver.percent}% waiver on $5,000 penalty = {formatCurrency(waiverAmount)} waived
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Approved by {waiver.approvedBy} on {waiver.date}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-amber-900">
                  {formatCurrency(penaltyBase - waiverAmount)}
                </div>
                <div className="text-xs text-amber-600">effective penalty</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Periods Owed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Periods Owed</CardTitle>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodsOwed.map(period => {
                const periodPayments = payments.filter(p => p.appliedPeriodId === period.id);
                const periodPaid = periodPayments.reduce((sum, p) => sum + p.amount, 0);
                const periodOutstanding = period.amount - periodPaid;
                
                return (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {formatPeriod(period.periodFrom, period.periodTo)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={period.type === 'arrears' ? 'destructive' : 'secondary'}>
                        {period.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(period.amount)}
                      {period.isEstimated && (
                        <span className="text-xs text-muted-foreground ml-1">(est.)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(periodPaid)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(periodOutstanding)}
                    </TableCell>
                    <TableCell>
                      {periodOutstanding === 0 ? (
                        <Badge variant="success">Paid</Badge>
                      ) : periodPaid > 0 ? (
                        <Badge variant="warning">Partial</Badge>
                      ) : (
                        <Badge variant="outline">Unpaid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payments</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Applied To Period</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(payment => {
                const appliedPeriod = periodsOwed.find(p => p.id === payment.appliedPeriodId);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {appliedPeriod ? formatPeriod(appliedPeriod.periodFrom, appliedPeriod.periodTo) : 'Unallocated'}
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Court Costs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Court Costs</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setCostOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cost
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map(cost => (
                <TableRow key={cost.id}>
                  <TableCell>
                    <Badge variant="outline">{cost.stage}</Badge>
                  </TableCell>
                  <TableCell>{cost.date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cost.note || '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(cost.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell colSpan={3} className="text-right">Total Costs</TableCell>
                <TableCell className="text-right">{formatCurrency(totalCosts)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        caseId={caseData.id}
        onPaymentRecorded={handleImportComplete}
      />

      <AddCostDialog
        open={costOpen}
        onOpenChange={setCostOpen}
        caseId={caseData.id}
        onCostAdded={handleImportComplete}
      />

      <ExcelImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type={importType}
        caseId={caseData.id}
      />
    </div>
  );
}
