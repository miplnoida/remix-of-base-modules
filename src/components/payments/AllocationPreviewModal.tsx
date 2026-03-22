import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AllocationLine {
  component: string;
  payment_code: string;
  fund_code: string;
  method: string;
  mop_code: string;
  allocated_amount: number;
  currency: string;
}

interface AllocationPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'c3' | 'invoice';
  /** C3 mode: components array */
  components?: { payment_code: string; fund_code: string; amount: number; sort_order?: number }[];
  /** Invoice mode: invoice IDs */
  invoiceIds?: number[];
  /** Payment methods */
  methods: { mop_code: string; currency_code: string; original_amount: number }[];
}

export const AllocationPreviewModal: React.FC<AllocationPreviewModalProps> = ({
  open, onOpenChange, mode, components, invoiceIds, methods,
}) => {
  const [lines, setLines] = useState<AllocationLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setFetched(false);
    try {
      const methodsJson = methods.map(m => ({
        mop_code: m.mop_code,
        currency_code: m.currency_code,
        original_amount: m.original_amount,
      }));

      const params: any = {
        p_mode: mode,
        p_components: mode === 'c3' ? (components || []) : [],
        p_methods: methodsJson,
      };
      if (mode === 'invoice' && invoiceIds) {
        params.p_invoice_ids = invoiceIds;
      }

      const { data, error } = await supabase.rpc('preview_payment_allocation' as any, params);
      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      setLines(Array.isArray(result) ? result : []);
      setFetched(true);
    } catch (err: any) {
      toast.error('Failed to load allocation preview', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [mode, components, invoiceIds, methods]);

  // Fetch when opened
  React.useEffect(() => {
    if (open) {
      fetchPreview();
    } else {
      setLines([]);
      setFetched(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = lines.reduce((s, l) => s + (l.allocated_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Allocation Preview
          </DialogTitle>
          <DialogDescription>
            Preview how the received amount will be distributed across payment components.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Calculating allocation...</span>
            </div>
          ) : lines.length === 0 && fetched ? (
            <p className="text-center py-8 text-muted-foreground">No allocation lines generated.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{line.component}</TableCell>
                      <TableCell className="text-muted-foreground">{line.payment_code}</TableCell>
                      <TableCell className="text-muted-foreground">{line.fund_code}</TableCell>
                      <TableCell>{line.method}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {line.currency} {line.allocated_amount?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {fetched && lines.length > 0 && (
          <div className="flex justify-end pt-2 border-t">
            <span className="text-sm font-medium text-muted-foreground mr-2">Total Allocated:</span>
            <span className="text-sm font-bold">{lines[0]?.currency} {total.toFixed(2)}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
