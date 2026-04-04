import React, { useState } from 'react';
import { Search, Calendar, CreditCard, FileText, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HistoricalSearchFilters } from '@/services/bn/historicalInquiryService';

interface HistorySearchPanelProps {
  onSearch: (filters: HistoricalSearchFilters) => void;
  isLoading?: boolean;
}

const CLAIM_STATUSES = [
  'DRAFT', 'SUBMITTED', 'APPROVED', 'DENIED', 'SUSPENDED', 'CLOSED', 'WITHDRAWN', 'IN_PAYMENT',
];

const PAYMENT_METHODS = [
  { value: 'CHQ', label: 'Cheque' },
  { value: 'DD', label: 'Direct Deposit' },
  { value: 'EFT', label: 'Electronic Transfer' },
];

export const HistorySearchPanel: React.FC<HistorySearchPanelProps> = ({ onSearch, isLoading }) => {
  const [searchType, setSearchType] = useState<'claims' | 'disbursements'>('claims');
  const [ssn, setSsn] = useState('');
  const [claimNumber, setClaimNumber] = useState('');
  const [claimantName, setClaimantName] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const handleSearch = () => {
    const filters: HistoricalSearchFilters = {
      search_type: searchType,
      limit: 200,
    };
    if (ssn.trim()) filters.ssn = ssn.trim();
    if (claimNumber.trim()) filters.claim_number = claimNumber.trim();
    if (status && status !== 'ALL') filters.status = status;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (searchType === 'disbursements') {
      if (chequeNumber.trim()) filters.cheque_number = chequeNumber.trim();
      if (paymentMethod && paymentMethod !== 'ALL') filters.payment_method = paymentMethod;
    }
    onSearch(filters);
  };

  const handleReset = () => {
    setSsn('');
    setClaimNumber('');
    setClaimantName('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setChequeNumber('');
    setPaymentMethod('');
  };

  return (
    <Card className="border-border">
      <CardContent className="pt-5 space-y-4">
        <Tabs value={searchType} onValueChange={(v) => setSearchType(v as 'claims' | 'disbursements')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="claims" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Claims History
            </TabsTrigger>
            <TabsTrigger value="disbursements" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Disbursement History
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">SSN</Label>
            <Input
              placeholder="Enter SSN"
              value={ssn}
              onChange={(e) => setSsn(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Claim Number</Label>
            <Input
              placeholder="Claim #"
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {CLAIM_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Date From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Date To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
          </div>

          {searchType === 'disbursements' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Cheque / Ref #</Label>
                <Input
                  placeholder="Cheque number"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleSearch} disabled={isLoading} size="sm" className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
          <Button onClick={handleReset} variant="outline" size="sm" className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
