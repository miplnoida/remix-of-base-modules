import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { ViolationFiltersBar, emptyViolationFilterState } from '@/components/compliance/ViolationFiltersBar';
import { fetchViolationsPaginated } from '@/services/complianceDataService';
import { useDebounce } from '@/hooks/useDebounce';

const MODULE = 'manage_compliance';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 });

function resolveRuleViolationTotal(v: any): number {
  if (!v) return 0;
  const t = v.total_amount;
  if (t != null && Number(t) !== 0) return Number(t);
  const sum = (Number(v.principal_amount ?? 0) || 0) + (Number(v.penalty_amount ?? 0) || 0) + (Number(v.interest_amount ?? 0) || 0);
  if (sum !== 0) return sum;
  return Number(t ?? 0) || 0;
}

function Inner() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ ...emptyViolationFilterState, source: 'DETECTION_RULE' });
  const debouncedSearch = useDebounce(filters.search, 350);

  const params = useMemo(() => ({
    ...filters,
    source: 'DETECTION_RULE',
    search: debouncedSearch || undefined,
    month: filters.month || undefined,
    page: 1,
    pageSize: 100,
  }), [filters, debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['ce_violations_rule_detected', JSON.stringify(params)],
    queryFn: () => fetchViolationsPaginated(params),
  });

  const rows = data?.rows ?? [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Rule Detected Violations"
        subtitle="Violations created by automated detection rules"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Violations', href: '/compliance/violations' },
          { label: 'Rule Detected' },
        ]}
      />
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <ViolationFiltersBar value={filters} onChange={setFilters} showSource={false} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.totalCount ?? 0} rule-detected violation(s)
            {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Violation #</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No rule-detected violations</TableCell></TableRow>
              ) : rows.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.violation_number}</TableCell>
                  <TableCell>{v.employer_name || v.employer_id || '-'}</TableCell>
                  <TableCell>{v.ce_violation_types?.name || '-'}</TableCell>
                  <TableCell>{v.fund_type || '-'}</TableCell>
                  <TableCell>{v.period_from || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{currencyFormatter.format(resolveRuleViolationTotal(v))}</TableCell>
                  <TableCell><Badge variant="outline">{v.status?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline">{v.verification_decision || 'PENDING'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RuleDetectedViolations() {
  return <PermissionWrapper moduleName={MODULE}><Inner /></PermissionWrapper>;
}
