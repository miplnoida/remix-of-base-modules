import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BnStatusBadge } from '@/components/bn/shared';
import { FileText, User, Calendar, Building2 } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { BnClaim, BnProduct } from '@/types/bn';

interface Props {
  claim: BnClaim;
  product: BnProduct | null;
}

export const ClaimContextBanner: React.FC<Props> = ({ claim, product }) => {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Claim</p>
            <p className="font-semibold text-sm">{claim.claim_number || claim.id.slice(0, 8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">SSN</p>
            <p className="font-mono text-sm">{claim.ssn}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Benefit</p>
            <p className="text-sm">{product?.benefit_name || claim.legacy_benefit_type || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Claim Date</p>
            <p className="text-sm">{claim.claim_date ? formatDateForDisplay(claim.claim_date) : '—'}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <BnStatusBadge status={claim.status} />
          {claim.priority === 'URGENT' && (
            <Badge variant="destructive" className="text-xs">URGENT</Badge>
          )}
        </div>
      </div>
    </div>
  );
};
