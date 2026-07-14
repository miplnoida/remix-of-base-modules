import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KV, dt, AwardMoney } from '../components';
import type { Award360Header as Award360HeaderVM, AwardAlert, AwardAuditItem } from '../viewModels';
import { Award360Alerts } from '../Award360Alerts';

interface Props {
  header: Award360HeaderVM;
  alerts: AwardAlert[];
  onOpenTab: (t: string) => void;
  recentActivity: AwardAuditItem[];
  warnings: string[];
}

export const AwardOverviewTab: React.FC<Props> = ({ header, alerts, onOpenTab, recentActivity, warnings }) => (
  <div className="space-y-4">
    {warnings.length ? (
      <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs">
        Partial data — {warnings.join('; ')}
      </div>
    ) : null}

    <Award360Alerts alerts={alerts} onOpenTab={onOpenTab} />

    <Card>
      <CardHeader><CardTitle className="text-base">Award summary</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        <KV label="Award number" value={header.awardNumber} />
        <KV label="Benefit" value={header.benefitName ?? header.benefitCode} />
        <KV label="Award type" value={header.awardType} />
        <KV label="Status" value={header.status} />
        <KV label="Current rate" value={<AwardMoney value={header.currentRate} currency={header.currency} />} />
        <KV label="Frequency" value={header.frequency} />
        <KV label="Start" value={dt(header.startDate)} />
        <KV label="End" value={dt(header.endDate)} />
        <KV label="Product version" value={header.productVersion} />
        <KV label="Currency" value={header.currency} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentActivity.slice(0, 10).map((a) => (
              <li key={a.id} className="flex justify-between gap-3 border-b pb-2 last:border-b-0">
                <div>
                  <span className="font-medium">{a.domain}</span> · {a.action}
                  {a.actor ? <span className="text-muted-foreground"> · {a.actor}</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">{dt(a.timestamp)}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  </div>
);
