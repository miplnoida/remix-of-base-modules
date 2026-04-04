import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BnStatusBadge, BnEmptyState } from '@/components/bn/shared';
import { Link } from 'react-router-dom';
import { GitBranch, ExternalLink } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { LinkedClaimRef } from '@/services/bn/determinationService';

interface Props {
  linkedClaims: LinkedClaimRef[];
}

export const LinkedClaimsContext: React.FC<Props> = ({ linkedClaims }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" /> Linked Claims
        </CardTitle>
      </CardHeader>
      <CardContent>
        {linkedClaims.length === 0 ? (
          <BnEmptyState type="empty" title="No linked claims" description="No other claims found for this contributor." />
        ) : (
          <div className="space-y-2">
            {linkedClaims.map((lc) => (
              <div key={lc.id} className="flex items-center justify-between rounded-md border p-2.5">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{lc.claim_number || lc.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{lc.benefit_type}</p>
                  </div>
                  <BnStatusBadge status={lc.status} />
                  <span className="text-xs text-muted-foreground">{lc.relationship}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateForDisplay(lc.claim_date)}
                  </span>
                  <Link to={`/bn/claims/${lc.id}`} className="text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
