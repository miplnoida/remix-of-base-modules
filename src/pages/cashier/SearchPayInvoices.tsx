import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Printer, XCircle, Loader2, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { InvoiceCancelModal } from '@/components/payments/InvoiceCancelModal';
import { useUserCode } from '@/hooks/useUserCode';
import { formatCurrencyWithCode } from '@/utils/currencyConverter';
import { formatDisplayDate } from '@/lib/dateFormat';

function useInvoiceStatuses() {
  return useQuery({
    queryKey: ['tb_invoice_status_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_invoice_status')
        .select('code, description')
        .eq('is_active', true)
        .order('description');
      if (error) throw error;
      return data as { code: string; description: string }[];
    },
  });
}

const SearchPayInvoices: React.FC = () => {
  const batchSel = useBatchSelection();
  const invoiceActions = useInvoiceActions();
  const { userCode } = useUserCode();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'invoice' | 'payer'>('invoice');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string>('');

  const { data: invoiceStatuses } = useInvoiceStatuses();

  const { data: invoices, isLoading: loadingInvoices, refetch } = useQuery({
    queryKey: ['cn_invoices_search', searchTerm, searchType, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('cn_invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm.trim()) {
        if (searchType === 'invoice') {
          query = query.ilike('invoice_number', `%${searchTerm.trim()}%`);
        } else {
          query = query.ilike('payer_name', `%${searchTerm.trim()}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const statusMap = useMemo(() => {
    const m = new Map<string, string>();
    (invoiceStatuses || []).forEach(s => m.set(s.code, s.description));
    return m;
  }, [invoiceStatuses]);

  const getStatusBadge = (status: string) => {
    const label = statusMap.get(status) || status;
    const variant = status === 'C' ? 'destructive' : status === 'O' ? 'default' : status === 'R' ? 'secondary' : 'outline';
    return <Badge variant={variant as any}>{label}</Badge>;
  };

  const handleReprint = async (invoiceId: number) => {
    await invoiceActions.reprintInvoice(invoiceId, userCode || 'SYSTEM');
    refetch();
  };

  const handleCancelClick = (invoiceId: number, invoiceNumber: string) => {
    setSelectedInvoiceId(invoiceId);
    setSelectedInvoiceNumber(invoiceNumber);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedInvoiceId) return;
    const result = await invoiceActions.cancelInvoice(selectedInvoiceId, reason, userCode || 'SYSTEM');
    if (result) {
      setShowCancelModal(false);
      setSelectedInvoiceId(null);
      refetch();
    }
  };

  return (
    <BatchSelectionGuard
      isLoading={batchSel.isLoading}
      isReady={batchSel.isReady}
      noBatchesAvailable={batchSel.noBatchesAvailable}
      showPopup={batchSel.showPopup}
      openBatches={batchSel.openBatches}
      canManageAllBatches={batchSel.canManageAllBatches}
      selectedBatch={batchSel.selectedBatch}
      onSelectBatch={batchSel.selectBatch}
      onChangeBatch={batchSel.changeBatch}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Search & Pay Invoices</h1>
            <p className="text-muted-foreground">Search, reprint, or cancel invoices</p>
          </div>
          <Badge variant="outline" className="text-sm">
            <FileText className="h-3 w-3 mr-1" />
            {invoices?.length || 0} Invoices
          </Badge>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {/* Search Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Invoices
            </CardTitle>
            <CardDescription>Search by invoice number or payer name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search Type</Label>
                <Select value={searchType} onValueChange={(v: 'invoice' | 'payer') => setSearchType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice Number</SelectItem>
                    <SelectItem value="payer">Payer Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search Term</Label>
                <Input
                  placeholder={searchType === 'invoice' ? 'Enter invoice number' : 'Enter payer name'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {(invoiceStatuses || []).map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => setSearchTerm('')} variant="outline" className="w-full">Clear Search</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Results */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Results</CardTitle>
            <CardDescription>Manage invoices — reprint or cancel as needed</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading invoices...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reprints</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoices || []).map((inv: any) => (
                    <TableRow key={inv.id} className={inv.status === 'C' ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm">{inv.payer_name || '-'}</span>
                          <span className="block text-xs text-muted-foreground">{inv.payer_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>{inv.invoice_type}</TableCell>
                      <TableCell>{formatCurrencyWithCode(inv.total_amount, inv.currency_code)}</TableCell>
                      <TableCell>{formatCurrencyWithCode(inv.total_amount_base, inv.base_currency)}</TableCell>
                      <TableCell>{inv.due_date ? formatDisplayDate(inv.due_date) : '-'}</TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-center">{inv.reprint_times || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReprint(inv.id)}
                            disabled={inv.status === 'C' || invoiceActions.isLoading}
                            title="Re-Print Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelClick(inv.id, inv.invoice_number)}
                            disabled={inv.status === 'C' || invoiceActions.isLoading}
                            title="Cancel Invoice"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loadingInvoices && (!invoices || invoices.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">No invoices found matching your search criteria</div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Invoice Modal */}
        <InvoiceCancelModal
          open={showCancelModal}
          onClose={() => { setShowCancelModal(false); setSelectedInvoiceId(null); }}
          onConfirm={handleCancelConfirm}
          isLoading={invoiceActions.isLoading}
          invoiceNumber={selectedInvoiceNumber}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default SearchPayInvoices;
