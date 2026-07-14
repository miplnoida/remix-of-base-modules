import React from 'react';
import type { Award360Header as Award360HeaderVM } from './viewModels';
import { AwardStatusBadge, KV, dt, AwardMoney } from './components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface Props {
  header: Award360HeaderVM;
  onBack: () => void;
  onRefresh: () => void;
}

export const Award360Header: React.FC<Props> = ({ header, onBack, onRefresh }) => (
  <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-4 border-b bg-background/95 px-6 py-4 backdrop-blur">
    <div className="flex items-start gap-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">
            Award {header.awardNumber ?? header.awardId.slice(0, 8)}
          </h1>
          <AwardStatusBadge status={header.status} />
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {header.payeeName ?? '—'} · SSN {header.ssnMasked ?? '—'} ·{' '}
          {header.benefitName ?? header.benefitCode ?? '—'} · {header.awardType ?? '—'}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-8 md:grid-cols-4">
          <KV label="Rate" value={<AwardMoney value={header.currentRate} currency={header.currency} />} />
          <KV label="Frequency" value={header.frequency} />
          <KV label="Start" value={dt(header.startDate)} />
          <KV label="End" value={dt(header.endDate)} />
          <KV label="Product version" value={header.productVersion} />
          <KV label="Last refreshed" value={new Date(header.lastRefreshedAt).toLocaleTimeString()} />
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="mr-1 h-4 w-4" /> Refresh
      </Button>
    </div>
  </div>
);
