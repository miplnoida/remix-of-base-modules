import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BnStatusBadge, BnEmptyState } from '@/components/bn/shared';
import { Gavel } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { BnClaimDecision } from '@/types/bn';

interface Props {
  decisions: BnClaimDecision[];
}

export const DecisionPanel: React.FC<Props> = ({ decisions }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gavel className="h-4 w-4" /> Decision History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {decisions.length === 0 ? (
          <div className="p-4">
            <BnEmptyState type="empty" title="No decisions recorded" description="Decisions will appear here after workflow actions are taken." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm font-medium">{d.action_code}</TableCell>
                  <TableCell><BnStatusBadge status={d.from_status} /></TableCell>
                  <TableCell><BnStatusBadge status={d.to_status} /></TableCell>
                  <TableCell className="text-sm max-w-48 truncate">
                    {d.reason_code?.reason_name || d.narrative || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.performed_by}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateForDisplay(d.performed_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
