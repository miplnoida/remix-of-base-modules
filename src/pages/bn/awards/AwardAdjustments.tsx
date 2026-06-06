/**
 * Award Adjustments — rate history across all awards (bn_award_rate_history).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBnAwardAdjustments } from '@/hooks/bn/useBnAwards';
import { formatDateForDisplay } from '@/lib/format-config';

export default function AwardAdjustments() {
  const navigate = useNavigate();
  const { data, isLoading } = useBnAwardAdjustments();

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Award Adjustments</h1>
        <p className="text-sm text-muted-foreground">Rate adjustments applied to long-term awards.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Award #</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Entered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>}
                {!isLoading && (data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No rate adjustments recorded.</TableCell></TableRow>
                )}
                {(data ?? []).map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => r.bn_award_id && navigate(`/bn/awards/${r.bn_award_id}`)}>
                    <TableCell className="font-mono text-xs">{r.bn_award?.award_number ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.bn_award?.ssn ?? '—'}</TableCell>
                    <TableCell>{r.bn_award?.benefit_code ?? '—'}</TableCell>
                    <TableCell>{r.effective_from ? formatDateForDisplay(r.effective_from) : '—'}</TableCell>
                    <TableCell>{r.effective_to ? formatDateForDisplay(r.effective_to) : '—'}</TableCell>
                    <TableCell className="text-right">{Number(r.rate_amount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{r.change_reason ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.entered_by ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
