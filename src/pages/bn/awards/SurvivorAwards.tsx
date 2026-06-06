/**
 * Survivor Awards — filtered view of bn_award where benefit is survivors.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBnAwards } from '@/hooks/bn/useBnAwards';
import { formatDateForDisplay } from '@/lib/format-config';

export default function SurvivorAwards() {
  const navigate = useNavigate();
  const { data, isLoading } = useBnAwards({ survivorsOnly: true });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Survivor Awards</h1>
        <p className="text-sm text-muted-foreground">
          Survivor benefit awards. One deceased insured person may have multiple beneficiaries — open the award to manage shares.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Award #</TableHead>
                  <TableHead>Deceased SSN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead className="text-right">Base Amt</TableHead>
                  <TableHead>Life Cert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>}
                {!isLoading && (data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No survivor awards.</TableCell></TableRow>
                )}
                {(data ?? []).map(a => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/bn/awards/${a.id}`)}>
                    <TableCell className="font-mono text-xs">{a.award_number ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.ssn ?? '—'}</TableCell>
                    <TableCell><Badge variant={a.status === 'ACTIVE' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                    <TableCell>{a.start_date ? formatDateForDisplay(a.start_date) : '—'}</TableCell>
                    <TableCell className="text-right">{a.base_amount?.toFixed?.(2) ?? '—'}</TableCell>
                    <TableCell>{a.life_certificate_status ?? '—'}</TableCell>
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
