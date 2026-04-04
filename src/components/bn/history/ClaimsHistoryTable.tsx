import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateForDisplay } from '@/lib/format-config';
import type { HistoricalClaimRecord } from '@/services/bn/historicalInquiryService';

interface ClaimsHistoryTableProps {
  data: HistoricalClaimRecord[];
  onViewDetail: (claim: HistoricalClaimRecord) => void;
  onNavigatePerson360?: (ssn: string) => void;
}

export const ClaimsHistoryTable: React.FC<ClaimsHistoryTableProps> = ({
  data,
  onViewDetail,
  onNavigatePerson360,
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No claims found matching the search criteria.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">Claim #</TableHead>
            <TableHead className="w-[100px]">SSN</TableHead>
            <TableHead>Claimant</TableHead>
            <TableHead>Benefit</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead className="w-[100px]">Filed</TableHead>
            <TableHead className="w-[80px]">Source</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((claim) => (
            <TableRow
              key={`${claim.source_table}-${claim.id}`}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => onViewDetail(claim)}
            >
              <TableCell className="font-mono text-xs font-medium">{claim.claim_number}</TableCell>
              <TableCell className="font-mono text-xs">{claim.ssn}</TableCell>
              <TableCell className="text-sm">{claim.claimant_name}</TableCell>
              <TableCell>
                <div className="text-sm">{claim.benefit_name}</div>
                <div className="text-xs text-muted-foreground">{claim.category}</div>
              </TableCell>
              <TableCell>
                <BnStatusBadge status={claim.status} size="sm" dot />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {claim.entered_at ? formatDateForDisplay(claim.entered_at) : '—'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {claim.source_table === 'bn_claim' ? 'Modern' : 'Legacy'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onViewDetail(claim); }}
                    title="View Detail"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {onNavigatePerson360 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); onNavigatePerson360(claim.ssn); }}
                      title="Person 360"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
