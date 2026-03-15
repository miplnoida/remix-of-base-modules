import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormat';
import type { BatchRow } from '@/hooks/useBatchSelection';

interface BatchSelectionGuardProps {
  isLoading: boolean;
  isReady: boolean;
  noBatchesAvailable: boolean;
  showPopup: boolean;
  openBatches: BatchRow[];
  canManageAllBatches: boolean;
  selectedBatch: BatchRow | null;
  onSelectBatch: (batch: BatchRow) => void;
  onChangeBatch: () => void;
  children: React.ReactNode;
}

export function BatchSelectionGuard({
  isLoading,
  isReady,
  noBatchesAvailable,
  showPopup,
  openBatches,
  canManageAllBatches,
  selectedBatch,
  onSelectBatch,
  onChangeBatch,
  children,
}: BatchSelectionGuardProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBatches = useMemo(() => {
    if (!searchTerm) return openBatches;
    const t = searchTerm.toLowerCase();
    return openBatches.filter(
      b =>
        b.batch_number.toLowerCase().includes(t) ||
        b.entered_by?.toLowerCase().includes(t) ||
        b.office_code?.toLowerCase().includes(t)
    );
  }, [openBatches, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading batch information...</span>
      </div>
    );
  }

  if (noBatchesAvailable) {
    return (
      <div className="flex items-center justify-center p-16">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-warning mx-auto" />
            <h2 className="text-lg font-semibold">No Open Batches Available</h2>
            <p className="text-sm text-muted-foreground">
              There are no open batches assigned to you. Please create a new batch from Batch Management before proceeding.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPopup && !isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Select Working Batch</h2>
              <p className="text-sm text-muted-foreground">
                {canManageAllBatches
                  ? 'Showing all open batches. Select the batch you want to work with.'
                  : 'Showing your assigned open batches. Select the batch you want to work with.'}
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by batch number, cashier, or office..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredBatches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No batches match your search.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map(b => (
                      <TableRow
                        key={b.batch_number}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onSelectBatch(b)}
                      >
                        <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                        <TableCell>{b.batch_date ? formatDisplayDate(b.batch_date) : '—'}</TableCell>
                        <TableCell>{b.entered_by || '—'}</TableCell>
                        <TableCell>{b.office_code || '—'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Select
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
      </div>
    );
  }

  return <>{children}</>;
}

/** Compact batch info bar shown at the top of guarded screens */
export function BatchInfoBar({
  batch,
  onChangeBatch,
}: {
  batch: BatchRow;
  onChangeBatch: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm flex-1">
            <div>
              <span className="text-muted-foreground text-xs block">Batch #</span>
              <span className="font-semibold font-mono text-xs">{batch.batch_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Status</span>
              <Badge variant="default">Open</Badge>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Batch Date</span>
              <span>{formatDisplayDate(batch.batch_date)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Cashier</span>
              <span>{batch.entered_by || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block">Office</span>
              <span>{batch.office_code || '—'}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onChangeBatch} className="gap-1">
            <ArrowRightLeft className="h-3 w-3" />
            Change Batch
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
