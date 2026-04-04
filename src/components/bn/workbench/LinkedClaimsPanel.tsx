/**
 * Claim Workbench — Section 9: Linked Claims Panel
 * 
 * Source: bn_claim (same SSN, different claim_id)
 * Future: cl_head.linked_claim_no, bn_claim.parent_claim_id, claim_family_ref
 * Read-only with navigation to linked claim
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, ExternalLink } from 'lucide-react';
import { BnStatusBadge } from '@/components/bn/shared';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import { formatDateForDisplay } from '@/lib/format-config';
import type { LinkedClaim } from '@/services/bn/claimWorkbenchService';

interface LinkedClaimsPanelProps {
  linkedClaims: LinkedClaim[];
  isLoading: boolean;
}

export const LinkedClaimsPanel: React.FC<LinkedClaimsPanelProps> = ({ linkedClaims, isLoading }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4" /> Linked Claims
          <Badge variant="secondary" className="text-xs">{linkedClaims.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : linkedClaims.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No linked claims</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {linkedClaims.map(lc => (
              <div
                key={lc.id}
                className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/bn/claims/${lc.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium">{lc.claim_number || lc.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground truncate">{lc.benefit_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatDateForDisplay(lc.claim_date)}</span>
                  <BnStatusBadge
                    status={lc.status}
                    label={BN_CLAIM_STATUS_LABELS[lc.status as keyof typeof BN_CLAIM_STATUS_LABELS] || lc.status}
                    size="sm"
                  />
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3 border-t pt-2">
          Future: parent/child relationships via cl_head.linked_claim_no and bn_claim.parent_claim_id
        </p>
      </CardContent>
    </Card>
  );
};
