import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Printer, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { getCardHistoryByPerson } from '@/services/cardManagementService';
import { CardHistory } from '@/types/cardManagement';
import { format } from 'date-fns';

interface CardHistoryTabProps {
  insuredPersonId: string;
}

export function CardHistoryTab({ insuredPersonId }: CardHistoryTabProps) {
  const [cardHistory, setCardHistory] = useState<CardHistory[]>([]);

  useEffect(() => {
    const history = getCardHistoryByPerson(insuredPersonId);
    setCardHistory(history);
  }, [insuredPersonId]);

  const getStatusBadge = (status: string) => {
    const colors = {
      Active: 'bg-green-500',
      Issued: 'bg-blue-500',
      Replaced: 'bg-gray-500',
      Spoiled: 'bg-red-500',
      Cancelled: 'bg-orange-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getReasonLabel = (code: string) => {
    const labels = {
      FIRST_ISSUE: 'First Issue',
      LOST: 'Lost',
      STOLEN: 'Stolen',
      DAMAGED: 'Damaged',
      NAME_CHANGE: 'Name Change',
      NON_CITIZEN_RENEWAL: 'Non-Citizen Renewal'
    };
    return labels[code as keyof typeof labels] || code;
  };

  const getPrintStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Spoiled':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  if (cardHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Card Issue History
          </CardTitle>
          <CardDescription>No card issuance records found for this insured person</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Issue History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Card Issue History
          </CardTitle>
          <CardDescription>All issued cards for this insured person</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sequence</TableHead>
                <TableHead>Card Number</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Print Count</TableHead>
                <TableHead>Spoiled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cardHistory.map((history) => (
                <TableRow key={history.cardIssue.cardIssueId}>
                  <TableCell className="font-semibold">#{history.cardIssue.issueSequence}</TableCell>
                  <TableCell className="font-mono text-sm">{history.cardIssue.cardNumber}</TableCell>
                  <TableCell>{getReasonLabel(history.cardIssue.issueReasonCode)}</TableCell>
                  <TableCell>{format(new Date(history.cardIssue.issueDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(history.cardIssue.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Printer className="h-4 w-4 text-muted-foreground" />
                      <span>{history.totalPrints}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {history.spoiledPrints > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        {history.spoiledPrints}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Print History Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print History
          </CardTitle>
          <CardDescription>Detailed print log for all cards</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card Number</TableHead>
                <TableHead>Print Copy</TableHead>
                <TableHead>Printed Date</TableHead>
                <TableHead>Printed By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cardHistory.flatMap((history) =>
                history.printLogs.map((log) => (
                  <TableRow key={log.cardPrintLogId}>
                    <TableCell className="font-mono text-sm">{history.cardIssue.cardNumber}</TableCell>
                    <TableCell>Copy {log.printCopyNumber}</TableCell>
                    <TableCell>{format(new Date(log.printedAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>{log.printedBy}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPrintStatusIcon(log.printStatus)}
                        <span>{log.printStatus}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
              {cardHistory.every(h => h.printLogs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No print logs available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
