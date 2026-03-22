import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StandardModal } from '@/components/common/StandardModal';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { formatCurrencyWithCode } from '@/utils/currencyConverter';
import { formatDisplayDate } from '@/lib/dateFormat';

interface InvoiceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number | null;
  /** Pre-resolved maps so we don't re-fetch lookups */
  invoiceTypeMap?: Map<string, string>;
  statusMap?: Map<string, string>;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceTypeMap,
  statusMap,
}) => {
  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['cn_invoice_detail', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const { data, error } = await supabase
        .from('cn_invoices')
        .select('*')
        .eq('id', invoiceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!invoiceId,
  });

  const { data: lines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['cn_invoice_lines', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabase
        .from('cn_invoice_lines')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!invoiceId,
  });

  const isLoading = loadingInvoice || loadingLines;

  const statusBadge = (status: string) => {
    const label = statusMap?.get(status) || status;
    const variant = status === 'C' ? 'destructive' : status === 'P' ? 'secondary' : status === 'O' ? 'default' : 'outline';
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={invoice ? `Invoice: ${invoice.invoice_number}` : 'Invoice Detail'}
      mode="view"
      size="3xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading invoice details...</span>
        </div>
      ) : !invoice ? (
        <p className="text-center py-8 text-muted-foreground">Invoice not found.</p>
      ) : (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Field label="Invoice Number" value={invoice.invoice_number} />
            <Field label="Status" value={statusBadge(invoice.status)} />
            <Field label="Type" value={invoiceTypeMap?.get(invoice.invoice_type) || invoice.invoice_type} />
            <Field label="Payment Source" value={invoice.payment_source} />
            <Field label="Currency" value={invoice.currency_code} />
            <Field label="Exchange Rate" value={invoice.exchange_rate?.toString() || '1'} />
            <Field label="Due Date" value={invoice.due_date ? formatDisplayDate(invoice.due_date) : '-'} />
            <Field label="Created" value={invoice.created_at ? formatDisplayDate(invoice.created_at) : '-'} />
            <Field label="Created By" value={invoice.created_by || '-'} />
          </div>

          {/* Payer Info */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Payer Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <Field label="Payer Name" value={invoice.payer_name || '-'} />
              <Field label="Payer ID" value={invoice.payer_id} />
              <Field label="Payer Type" value={invoice.payer_type} />
              <Field label="Email" value={invoice.payer_email || '-'} />
              <Field label="Phone" value={invoice.payer_phone || '-'} />
              <Field label="Address" value={invoice.payer_address || '-'} />
            </div>
          </div>

          {/* Financials */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Financial Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <Field label="Total Amount" value={formatCurrencyWithCode(invoice.total_amount, invoice.currency_code)} bold />
              <Field label="Total (Base)" value={formatCurrencyWithCode(invoice.total_amount_base, invoice.base_currency)} />
              <Field label="Paid Amount" value={formatCurrencyWithCode(invoice.paid_amount || 0, invoice.currency_code)} />
              <Field label="Outstanding" value={formatCurrencyWithCode(invoice.outstanding_amount || 0, invoice.currency_code)} bold />
            </div>
          </div>

          {/* Cancel Info */}
          {invoice.status === 'C' && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-md p-3">
              <h4 className="text-sm font-semibold text-destructive mb-2">Cancellation Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                <Field label="Cancel Date" value={invoice.cancel_date ? formatDisplayDate(invoice.cancel_date) : '-'} />
                <Field label="Cancelled By" value={invoice.cancel_user || '-'} />
                <Field label="Reason" value={invoice.cancel_reason || '-'} />
              </div>
            </div>
          )}

          {/* Notes */}
          {(invoice.public_notes || invoice.internal_notes) && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Notes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {invoice.public_notes && <Field label="Public Notes" value={invoice.public_notes} />}
                {invoice.internal_notes && <Field label="Internal Notes" value={invoice.internal_notes} />}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Line Items ({lines.length})</h4>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items found.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Payment Code</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Base Amount</TableHead>
                      <TableHead>Base Currency</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line: any, idx: number) => (
                      <TableRow key={line.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{line.payment_code}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrencyWithCode(line.amount, line.currency_code)}</TableCell>
                        <TableCell>{line.currency_code}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrencyWithCode(line.amount_base, line.base_currency)}</TableCell>
                        <TableCell>{line.base_currency}</TableCell>
                        <TableCell className="text-right">{line.exchange_rate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}
    </StandardModal>
  );
};

/* Small helper for label-value pairs */
const Field: React.FC<{ label: string; value: React.ReactNode; bold?: boolean }> = ({ label, value, bold }) => (
  <div>
    <span className="text-muted-foreground">{label}</span>
    <p className={`mt-0.5 ${bold ? 'font-semibold' : ''}`}>{value}</p>
  </div>
);
