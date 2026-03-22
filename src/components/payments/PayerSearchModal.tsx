import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2, Inbox } from 'lucide-react';
import type { PayerInfo } from '@/hooks/usePaymentEntry';

interface PayerSearchModalProps {
  open: boolean;
  onClose: () => void;
  payerType: string;
  onSelect: (payer: PayerInfo) => void;
  searchFn: (payerType: string, term: string) => Promise<PayerInfo[]>;
}

export function PayerSearchModal({ open, onClose, payerType, onSelect, searchFn }: PayerSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<PayerInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const data = await searchFn(payerType, searchTerm.trim());
      setResults(data);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, payerType, searchFn]);

  const handleSelect = (payer: PayerInfo) => {
    onSelect(payer);
    onClose();
    setSearchTerm('');
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearchTerm(''); setResults([]); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Payer</DialogTitle>
          <DialogDescription>
            Searching {payerType === 'ER' || payerType === 'SE' ? 'Employers' : payerType === 'AP' ? 'Accounts Payable Payers' : 'Insured Persons'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Enter name, ID, or SSN..."
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <Inbox className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm">{isSearching ? 'Searching...' : 'No results'}</p>
                  </TableCell>
                </TableRow>
              ) : (
                results.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelect(p)}>
                    <TableCell className="font-mono text-sm">{p.id}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-xs">{p.status || '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleSelect(p)}>Select</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
