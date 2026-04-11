import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Download, RotateCcw, Plus, DollarSign, TrendingDown,
  TrendingUp, AlertTriangle, FileText, Loader2
} from 'lucide-react';
import {
  useEmployerStatement, useEmployerArrears, usePostLedgerEntry,
  useReverseLedgerEntry, type LedgerEntry
} from '@/hooks/useComplianceLedger';

const FUND_TYPES = ['SS', 'LEVY', 'EI'] as const;
const ENTRY_TYPES = [
  'C3_DUES_POSTED', 'PAYMENT_RECEIVED', 'PENALTY_ASSESSED', 'INTEREST_ACCRUED',
  'WAIVER_APPLIED', 'ADJUSTMENT', 'WRITE_OFF', 'OPENING_BALANCE', 'TRANSFER_IN',
] as const;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount);

const entryTypeColor = (type: string) => {
  if (['C3_DUES_POSTED', 'PENALTY_ASSESSED', 'INTEREST_ACCRUED'].includes(type)) return 'destructive' as const;
  if (['PAYMENT_RECEIVED', 'WAIVER_APPLIED', 'ARRANGEMENT_CREDIT'].includes(type)) return 'default' as const;
  if (type === 'REVERSAL') return 'secondary' as const;
  return 'outline' as const;
};

const statusBadge = (status: string) => {
  if (status === 'POSTED') return 'default' as const;
  if (status === 'REVERSED') return 'destructive' as const;
  return 'secondary' as const;
};

export default function EmployerFinancialStatement() {
  const { id: employerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fundFilter, setFundFilter] = useState<string>('all');
  const [fromPeriod, setFromPeriod] = useState('');
  const [toPeriod, setToPeriod] = useState('');
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // New entry form
  const [newEntry, setNewEntry] = useState({
    entry_type: 'C3_DUES_POSTED',
    fund_type: 'SS',
    period: '',
    amount: 0,
    description: '',
  });

  const { data: statement = [], isLoading: stmtLoading } = useEmployerStatement(
    employerId,
    fromPeriod || undefined,
    toPeriod || undefined,
    fundFilter !== 'all' ? fundFilter : undefined
  );

  const { data: arrears = [], isLoading: arrearsLoading } = useEmployerArrears(employerId);

  const postMutation = usePostLedgerEntry();
  const reversalMutation = useReverseLedgerEntry();

  const totalArrears = arrears.reduce((sum, a) => sum + (a.net_balance || 0), 0);
  const totalPrincipal = arrears.reduce((sum, a) => sum + (a.principal_due || 0), 0);
  const totalPenalties = arrears.reduce((sum, a) => sum + (a.penalties || 0), 0);
  const totalPayments = arrears.reduce((sum, a) => sum + (a.payments || 0), 0);

  const handlePostEntry = () => {
    if (!employerId) return;
    postMutation.mutate({
      employer_id: employerId,
      entry_type: newEntry.entry_type,
      fund_type: newEntry.fund_type,
      period: newEntry.period,
      amount: newEntry.amount,
      description: newEntry.description,
      posted_by: 'CURRENT_USER',
    }, {
      onSuccess: () => {
        setShowPostDialog(false);
        setNewEntry({ entry_type: 'C3_DUES_POSTED', fund_type: 'SS', period: '', amount: 0, description: '' });
      },
    });
  };

  const handleReversal = () => {
    if (!selectedEntry) return;
    reversalMutation.mutate({
      original_entry_id: selectedEntry.entry_id,
      reversal_reason: reversalReason,
      reversed_by: 'CURRENT_USER',
    }, {
      onSuccess: () => {
        setShowReversalDialog(false);
        setSelectedEntry(null);
        setReversalReason('');
      },
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financial Statement</h1>
            <p className="text-muted-foreground">Employer: {employerId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPostDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Post Entry
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Arrears</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(totalArrears)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Principal Due</p>
                <p className="text-xl font-bold">{formatCurrency(totalPrincipal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Penalties</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPenalties)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingDown className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payments Made</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arrears by Fund */}
      {arrears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Arrears by Fund Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Penalties</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Waivers</TableHead>
                  <TableHead className="text-right">Write-offs</TableHead>
                  <TableHead className="text-right font-bold">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrears.map((a) => (
                  <TableRow key={a.fund_type}>
                    <TableCell><Badge variant="outline">{a.fund_type}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(a.principal_due)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(a.penalties)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(a.interest)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(a.payments)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(a.waivers)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(a.write_offs)}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      {formatCurrency(a.net_balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transaction Ledger */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Transaction Ledger
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="From Period (YYYYMM)"
                value={fromPeriod}
                onChange={(e) => setFromPeriod(e.target.value)}
                className="w-40"
              />
              <Input
                placeholder="To Period (YYYYMM)"
                value={toPeriod}
                onChange={(e) => setToPeriod(e.target.value)}
                className="w-40"
              />
              <Select value={fundFilter} onValueChange={setFundFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Funds</SelectItem>
                  {FUND_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stmtLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  statement.map((entry) => (
                    <TableRow key={entry.entry_id} className={entry.status === 'REVERSED' ? 'opacity-50 line-through' : ''}>
                      <TableCell className="text-sm">
                        {new Date(entry.posted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.period}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{entry.fund_type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={entryTypeColor(entry.entry_type)} className="text-xs">
                          {entry.entry_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{entry.description}</TableCell>
                      <TableCell className="text-right text-sm text-destructive">
                        {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-600">
                        {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(entry.running_balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge(entry.status)} className="text-xs">
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.status === 'POSTED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowReversalDialog(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Post Entry Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Ledger Entry</DialogTitle>
            <DialogDescription>Post a new financial entry to this employer's ledger.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entry Type</Label>
                <Select value={newEntry.entry_type} onValueChange={(v) => setNewEntry({ ...newEntry, entry_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fund Type</Label>
                <Select value={newEntry.fund_type} onValueChange={(v) => setNewEntry({ ...newEntry, fund_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUND_TYPES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period (YYYYMM)</Label>
                <Input value={newEntry.period} onChange={(e) => setNewEntry({ ...newEntry, period: e.target.value })} placeholder="202601" />
              </div>
              <div>
                <Label>Amount (XCD)</Label>
                <Input type="number" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="Entry description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostDialog(false)}>Cancel</Button>
            <Button onClick={handlePostEntry} disabled={postMutation.isPending}>
              {postMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reversal Dialog */}
      <Dialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Ledger Entry</DialogTitle>
            <DialogDescription>
              Reversing: {selectedEntry?.description} ({formatCurrency(selectedEntry?.debit_amount || selectedEntry?.credit_amount || 0)})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reversal Reason</Label>
            <Textarea value={reversalReason} onChange={(e) => setReversalReason(e.target.value)} placeholder="Reason for reversal..." className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReversalDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReversal} disabled={reversalMutation.isPending || !reversalReason.trim()}>
              {reversalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
