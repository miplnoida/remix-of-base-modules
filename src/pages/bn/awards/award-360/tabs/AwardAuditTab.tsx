import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabLoading, TabErrorState, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardAudit } from '../useAward360Queries';

export const AwardAuditTab: React.FC<{ awardId: string; canViewCentralAudit: boolean }> = ({ awardId, canViewCentralAudit }) => {
  const [domain, setDomain] = useState<string>('');
  const { data = [], isLoading, error, refetch } = useAwardAudit(awardId, canViewCentralAudit);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  const filtered = domain ? data.filter((d) => d.domain === domain) : data;
  const domains = Array.from(new Set(data.map((d) => d.domain)));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Audit timeline</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!canViewCentralAudit ? (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-xs">
            Central audit rows are hidden — audit permission is required to view core_audit_log entries.
          </div>
        ) : null}
        <div className="flex gap-2 text-xs">
          <label className="text-muted-foreground">Domain:</label>
          <select className="rounded border px-2 py-1" value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">All</option>
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <SimpleTable
          rows={filtered}
          empty="No audit events."
          columns={[
            { key: 'timestamp', label: 'When', render: (r) => dt(r.timestamp) },
            { key: 'domain', label: 'Domain' },
            { key: 'action', label: 'Action' },
            { key: 'actor', label: 'Actor' },
            { key: 'fromValue', label: 'From' },
            { key: 'toValue', label: 'To' },
            { key: 'reason', label: 'Reason' },
            { key: 'severity', label: 'Severity' },
          ]}
        />
      </CardContent>
    </Card>
  );
};
