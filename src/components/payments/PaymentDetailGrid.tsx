import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FileEdit, Inbox, CreditCard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DetailLineData } from './AddDetailModal';

interface PaymentDetailGridProps {
  rows: DetailLineData[];
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
  onEditRow: (index: number) => void;
  onEditMopDetail?: (index: number) => void;
  disabled?: boolean;
  totalAmount: number;
  showChequeDetails?: boolean;
  showCardDetails?: boolean;
}

const FUND_LABELS: Record<string, string> = {
  SS: 'Social Security',
  LV: 'Levy',
};

function needsMopDetail(mopCode: string, showCheque: boolean, showCard: boolean): boolean {
  if ((mopCode === 'CHQ' || mopCode === 'CHK') && showCheque) return true;
  if ((mopCode === 'CRD' || mopCode === 'DRD') && showCard) return true;
  return false;
}

function hasMopDetail(row: DetailLineData, showCheque: boolean, showCard: boolean): boolean {
  if ((row.mop_code === 'CRD' || row.mop_code === 'DRD') && showCard) return !!row.credit_card_code && !!row.mop_number;
  if ((row.mop_code === 'CHQ' || row.mop_code === 'CHK') && showCheque) return !!row.mop_number;
  return true;
}

export function PaymentDetailGrid({
  rows,
  onAddRow,
  onDeleteRow,
  onEditRow,
  onEditMopDetail,
  disabled,
  totalAmount,
  showChequeDetails = false,
  showCardDetails = false,
}: PaymentDetailGridProps) {
  return (
    <Card>
      <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Payment Details</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-primary">
            Total: ${totalAmount.toFixed(2)}
          </span>
          <Button type="button" size="sm" onClick={onAddRow} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method of Payment</TableHead>
                <TableHead className="w-[110px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="h-8 w-8" />
                      <p className="text-sm">No payment lines. Click "Add Line" to begin.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const missingMop = needsMopDetail(row.mop_code, showChequeDetails, showCardDetails) && !hasMopDetail(row, showChequeDetails, showCardDetails);
                  return (
                    <TableRow key={idx} className={missingMop ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{row.payment_code_desc || row.payment_code}</span>
                      </TableCell>
                      <TableCell className="text-xs">{row.fund_code_desc || FUND_LABELS[row.fund_code] || row.fund_code}</TableCell>
                      <TableCell className="text-right font-mono">${(row.payment_amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{row.mop_desc || row.mop_code}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button" variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => onEditRow(idx)} disabled={disabled}
                                >
                                  <FileEdit className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Line</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {needsMopDetail(row.mop_code, showChequeDetails, showCardDetails) && onEditMopDetail && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant={missingMop ? 'default' : 'ghost'}
                                    size="icon"
                                    className={`h-7 w-7 ${missingMop ? 'animate-pulse' : ''}`}
                                    onClick={() => onEditMopDetail(idx)}
                                    disabled={disabled}
                                  >
                                    <CreditCard className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{missingMop ? 'Add MOP Details (Required)' : 'Edit MOP Details'}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                  onClick={() => onDeleteRow(idx)} disabled={disabled}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Line</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
