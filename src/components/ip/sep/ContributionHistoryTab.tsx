import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';
import { SelfEmployedService, SEPContributionRate } from '@/services/selfEmployedService';

interface ContributionHistoryTabProps {
  ssn: string;
  selfEmployed: ReturnType<typeof useSelfEmployed>;
}

export const ContributionHistoryTab: React.FC<ContributionHistoryTabProps> = ({ ssn, selfEmployed }) => {
  const {
    activities,
    weeksPaid,
    contributionSummary,
    categories,
    loading,
    loadWeeksPaid,
    addWeeksPaid,
  } = selfEmployed;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [contributionRate, setContributionRate] = useState<SEPContributionRate | null>(null);
  const [form, setForm] = useState({
    period: '',
    pay_period: '',
    paid_code1: '',
    paid_code2: '',
    paid_code3: '',
    paid_code4: '',
    paid_code5: '',
    paid_code6: '',
    sep_ss_amt: '',
  });

  const selfRefNo = activities.length > 0 ? activities[0].self_ref_no : null;
  const isEditable = activities.length > 0 && ['P', 'V', 'A'].includes(activities[0]?.status || '');

  useEffect(() => {
    if (selfRefNo) {
      loadWeeksPaid(selfRefNo);
    }
  }, [selfRefNo, loadWeeksPaid]);

  // Lookup rate when period changes
  useEffect(() => {
    const lookupRate = async () => {
      if (!form.period || categories.length === 0) return;
      const activeCategory = categories.find(c => {
        const start = new Date(c.effective_start_date);
        const end = c.effective_end_date ? new Date(c.effective_end_date) : new Date('2099-12-31');
        const period = new Date(form.period);
        return period >= start && period <= end;
      });
      if (activeCategory && activeCategory.wage_category) {
        const rate = await SelfEmployedService.getContributionRate(activeCategory.wage_category, form.period);
        setContributionRate(rate);
      }
    };
    lookupRate();
  }, [form.period, categories]);

  const handleAdd = async () => {
    if (!selfRefNo || !form.period) return;
    // Get next sequence number
    const nextSeq = weeksPaid.length > 0
      ? Math.max(...weeksPaid.map(w => w.sequence_no)) + 1
      : 1;

    await addWeeksPaid({
      ssn,
      payer_id: selfRefNo,
      payer_type: 'SE',
      sequence_no: nextSeq,
      period: form.period,
      pay_period: form.pay_period || null,
      paid_code1: form.paid_code1 || null,
      paid_code2: form.paid_code2 || null,
      paid_code3: form.paid_code3 || null,
      paid_code4: form.paid_code4 || null,
      paid_code5: form.paid_code5 || null,
      paid_code6: form.paid_code6 || null,
      sep_ss_amt: form.sep_ss_amt ? parseFloat(form.sep_ss_amt) : null,
    });
    setShowAddDialog(false);
    setForm({ period: '', pay_period: '', paid_code1: '', paid_code2: '', paid_code3: '', paid_code4: '', paid_code5: '', paid_code6: '', sep_ss_amt: '' });
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Register as self-employed first to view contribution history.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Contributions</p>
              <p className="text-lg font-bold">{contributionSummary?.total_contributions ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total SS Amount</p>
              <p className="text-lg font-bold">${(contributionSummary?.total_ss_amount ?? 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Earliest Period</p>
            <p className="text-sm font-medium">
              {contributionSummary?.earliest_period ? format(new Date(contributionSummary.earliest_period), 'dd/MM/yyyy') : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Latest Period</p>
            <p className="text-sm font-medium">
              {contributionSummary?.latest_period ? format(new Date(contributionSummary.latest_period), 'dd/MM/yyyy') : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Payer Type: <Badge variant="outline">SE (Self-Employed)</Badge>
          <span className="ml-2">SREF: <strong className="font-mono">{selfRefNo}</strong></span>
        </div>
        {isEditable && (
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Contribution
          </Button>
        )}
      </div>

      {/* Weeks Paid Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seq</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Wk1</TableHead>
                <TableHead>Wk2</TableHead>
                <TableHead>Wk3</TableHead>
                <TableHead>Wk4</TableHead>
                <TableHead>Wk5</TableHead>
                <TableHead>Wk6</TableHead>
                <TableHead>SS Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeksPaid.map((w) => (
                <TableRow key={`${w.ssn}-${w.payer_id}-${w.sequence_no}-${w.period}`}>
                  <TableCell className="font-mono">{w.sequence_no}</TableCell>
                  <TableCell>{w.period ? format(new Date(w.period), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{w.pay_period || '-'}</TableCell>
                  <TableCell><PaidCodeBadge code={w.paid_code1} /></TableCell>
                  <TableCell><PaidCodeBadge code={w.paid_code2} /></TableCell>
                  <TableCell><PaidCodeBadge code={w.paid_code3} /></TableCell>
                  <TableCell><PaidCodeBadge code={w.paid_code4} /></TableCell>
                  <TableCell><PaidCodeBadge code={w.paid_code5} /></TableCell>
                  <TableCell><PaidCodeBadge code={w.paid_code6} /></TableCell>
                  <TableCell className="font-mono">{w.sep_ss_amt != null ? `$${w.sep_ss_amt.toFixed(2)}` : '-'}</TableCell>
                </TableRow>
              ))}
              {weeksPaid.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No contribution records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Contribution Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Contribution Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period *</Label>
              <Input type="date" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
            </div>
            {contributionRate && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>SS Rate: <strong>{contributionRate.sep_ss_percent}%</strong></p>
                {contributionRate.sep_penalty_percent && (
                  <p>Penalty Rate: <strong>{contributionRate.sep_penalty_percent}%</strong></p>
                )}
              </div>
            )}
            <div>
              <Label>Pay Period</Label>
              <Input value={form.pay_period} onChange={(e) => setForm({ ...form, pay_period: e.target.value })} maxLength={2} placeholder="e.g., 01" />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((wk) => (
                <div key={wk}>
                  <Label className="text-xs">Wk{wk}</Label>
                  <Input
                    value={(form as any)[`paid_code${wk}`] || ''}
                    onChange={(e) => setForm({ ...form, [`paid_code${wk}`]: e.target.value.slice(0, 1).toUpperCase() })}
                    maxLength={1}
                    placeholder="P"
                    className="text-center"
                  />
                </div>
              ))}
            </div>
            <div>
              <Label>SS Contribution Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={form.sep_ss_amt}
                onChange={(e) => setForm({ ...form, sep_ss_amt: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.period || loading}>Add Contribution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function PaidCodeBadge({ code }: { code: string | null }) {
  if (!code) return <span className="text-muted-foreground">-</span>;
  const variant = code === 'P' ? 'default' : code === 'U' ? 'destructive' : 'secondary';
  return <Badge variant={variant} className="text-xs px-1">{code}</Badge>;
}
