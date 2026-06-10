import React, { useState } from 'react';
import { History, FileText, CreditCard, TrendingUp, Lock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { HistorySearchPanel } from '@/components/bn/history/HistorySearchPanel';
import { ClaimsHistoryTable } from '@/components/bn/history/ClaimsHistoryTable';
import { DisbursementsHistoryTable } from '@/components/bn/history/DisbursementsHistoryTable';
import { ClaimDetailDrawer } from '@/components/bn/history/ClaimDetailDrawer';
import { DisbursementDetailDrawer } from '@/components/bn/history/DisbursementDetailDrawer';
import { useBnHistoricalClaims, useBnHistoricalDisbursements } from '@/hooks/bn/useBnHistoricalInquiry';
import { useTablePagination } from '@/hooks/useTablePagination';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type {
  HistoricalSearchFilters,
  HistoricalClaimRecord,
  HistoricalDisbursementRecord,
} from '@/services/bn/historicalInquiryService';

import { formatNumber } from '@/lib/culture/culture';
const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; color?: string }> = ({
  icon: Icon, label, value, color = 'text-primary',
}) => (
  <Card className="border-border">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default function HistoricalInquiry() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<HistoricalSearchFilters | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<HistoricalClaimRecord | null>(null);
  const [selectedDisbursement, setSelectedDisbursement] = useState<HistoricalDisbursementRecord | null>(null);

  const claimsQuery = useBnHistoricalClaims(filters?.search_type === 'claims' ? filters : null);
  const disbQuery = useBnHistoricalDisbursements(filters?.search_type === 'disbursements' ? filters : null);

  const claimsPagination = useTablePagination(claimsQuery.data || [], 25);
  const disbPagination = useTablePagination(disbQuery.data || [], 25);

  const isLoading = claimsQuery.isLoading || disbQuery.isLoading;
  const searchType = filters?.search_type || 'claims';

  const handleSearch = (f: HistoricalSearchFilters) => {
    setFilters(f);
    claimsPagination.resetPagination();
    disbPagination.resetPagination();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="t-page-title">Historical Inquiry</h1>
            <p className="text-sm text-muted-foreground">
              Search and view legacy claims and benefit disbursement history
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Read-Only</span>
        </div>
      </div>

      {/* Stats */}
      {filters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {searchType === 'claims' ? (
            <>
              <StatCard icon={FileText} label="Results" value={claimsQuery.data?.length || 0} />
              <StatCard icon={TrendingUp} label="Active" value={claimsQuery.data?.filter(c => !['CLOSED', 'DENIED', 'WITHDRAWN'].includes(c.status)).length || 0} />
              <StatCard icon={Lock} label="Closed" value={claimsQuery.data?.filter(c => c.status === 'CLOSED').length || 0} />
              <StatCard icon={AlertCircle} label="Denied" value={claimsQuery.data?.filter(c => c.status === 'DENIED').length || 0} />
            </>
          ) : (
            <>
              <StatCard icon={CreditCard} label="Results" value={disbQuery.data?.length || 0} />
              <StatCard icon={TrendingUp} label="Total Disbursed" value={
                `$${formatNumber((disbQuery.data?.reduce((s, d) => s + d.amount, 0) || 0), 2)}`
              } />
              <StatCard icon={Lock} label="Held" value={disbQuery.data?.filter(d => d.source_table === 'cl_cheques_holding').length || 0} />
              <StatCard icon={AlertCircle} label="Survivor" value={disbQuery.data?.filter(d => d.source_table === 'cl_cheques_survivor').length || 0} />
            </>
          )}
        </div>
      )}

      {/* Search Panel */}
      <HistorySearchPanel onSearch={handleSearch} isLoading={isLoading} />

      {/* Results */}
      {filters && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {searchType === 'claims' ? 'Claims History' : 'Disbursement History'}
            </h3>
            {((searchType === 'claims' && claimsPagination.pagination.totalPages > 1) ||
              (searchType === 'disbursements' && disbPagination.pagination.totalPages > 1)) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {(() => {
                  const p = searchType === 'claims' ? claimsPagination : disbPagination;
                  return (
                    <>
                      <span>Page {p.pagination.page} of {p.pagination.totalPages}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={p.prevPage} disabled={p.pagination.page === 1}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={p.nextPage} disabled={p.pagination.page === p.pagination.totalPages}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {searchType === 'claims' ? (
            <ClaimsHistoryTable
              data={claimsPagination.paginatedData}
              onViewDetail={setSelectedClaim}
              onNavigatePerson360={(ssn) => navigate(`/bn/person360?ssn=${ssn}`)}
            />
          ) : (
            <DisbursementsHistoryTable
              data={disbPagination.paginatedData}
              onViewDetail={setSelectedDisbursement}
            />
          )}

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">Searching…</div>
          )}
        </div>
      )}

      {!filters && (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Enter search criteria above</p>
          <p className="text-sm mt-1">Search across claims history and benefit disbursements</p>
        </div>
      )}

      {/* Detail Drawers */}
      <ClaimDetailDrawer
        claim={selectedClaim}
        open={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />
      <DisbursementDetailDrawer
        record={selectedDisbursement}
        open={!!selectedDisbursement}
        onClose={() => setSelectedDisbursement(null)}
      />
    </div>
  );
}
