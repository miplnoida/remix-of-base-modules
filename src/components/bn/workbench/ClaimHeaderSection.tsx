/**
 * Claim Workbench — Section 1: Claim Header
 * 
 * Fields:
 *   claim_number (bn_claim.claim_number) — Read-only, auto-generated
 *   status (bn_claim.status) — Read-only badge, changed via actions
 *   priority (bn_claim.priority) — Editable by CLAIMS_OFFICER, SUPERVISOR, ADMIN
 *   source (bn_claim.source) — Editable in DRAFT/SUBMITTED
 *   claim_date (bn_claim.claim_date) — Editable in DRAFT
 *   submission_date (bn_claim.submission_date) — Read-only
 *   assigned_to (bn_claim.assigned_to) — Editable by SUPERVISOR, ADMIN
 *   legacy_claim_ref (bn_claim.legacy_claim_ref) — Read-only
 *   workflow_instance_id — Read-only link
 * 
 * Future: cl_head.claim_no displayed alongside bn_claim.claim_number
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BnStatusBadge } from '@/components/bn/shared';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import { formatDisplayDate } from '@/lib/dateFormat';

interface ClaimHeaderSectionProps {
  claim: {
    id: string;
    claim_number: string | null;
    status: string;
    priority: string;
    source: string;
    claim_date: string;
    submission_date: string | null;
    assigned_to: string | null;
    legacy_claim_ref: string | null;
    workflow_instance_id: string | null;
  };
  isEditable: boolean;
  onUpdate: (field: string, value: string) => void;
  userRoles: string[];
}

const EDITABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'INTAKE_REVIEW'];

export const ClaimHeaderSection: React.FC<ClaimHeaderSectionProps> = ({
  claim, isEditable, onUpdate, userRoles,
}) => {
  const PRIORITY_ROLES = ['admin', 'claims_officer', 'BN_INTAKE_OFFICER', 'BN_ELIGIBILITY_OFFICER', 'BN_SENIOR_ELIGIBILITY_OFFICER', 'BN_SUPERVISOR', 'BN_MANAGER', 'BN_DIRECTOR'];
  const ASSIGN_ROLES = ['admin', 'BN_SUPERVISOR', 'BN_MANAGER', 'BN_DIRECTOR'];
  const canEditPriority = isEditable && userRoles.some(r => PRIORITY_ROLES.includes(r));
  const canEditAssignment = userRoles.some(r => ASSIGN_ROLES.includes(r));
  const canEditSource = isEditable && EDITABLE_STATUSES.includes(claim.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Claim Header</CardTitle>
          <div className="flex items-center gap-2">
            <BnStatusBadge
              status={claim.status}
              label={BN_CLAIM_STATUS_LABELS[claim.status as keyof typeof BN_CLAIM_STATUS_LABELS] || claim.status}
              dot
            />
            <BnStatusBadge status={claim.priority} size="sm" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* claim_number — read-only */}
          <div>
            <Label className="text-xs text-muted-foreground">Claim Number</Label>
            <p className="font-mono font-medium text-foreground mt-1">{claim.claim_number || '(Auto-generated)'}</p>
          </div>

          {/* claim_date */}
          <div>
            <Label className="text-xs text-muted-foreground">Claim Date</Label>
            <p className="font-medium text-foreground mt-1">{formatDisplayDate(claim.claim_date)}</p>
          </div>

          {/* submission_date — read-only */}
          <div>
            <Label className="text-xs text-muted-foreground">Submission Date</Label>
            <p className="text-foreground mt-1">{claim.submission_date ? formatDisplayDate(claim.submission_date) : '—'}</p>
          </div>

          {/* legacy_claim_ref — read-only */}
          {claim.legacy_claim_ref && (
            <div>
              <Label className="text-xs text-muted-foreground">Legacy Ref</Label>
              <p className="font-mono text-sm text-foreground mt-1">{claim.legacy_claim_ref}</p>
            </div>
          )}

          {/* priority — editable */}
          <div>
            <Label className="text-xs text-muted-foreground">Priority</Label>
            {canEditPriority ? (
              <Select value={claim.priority} onValueChange={v => onUpdate('priority', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <BnStatusBadge status={claim.priority} size="sm" />
            )}
          </div>

          {/* source — editable in DRAFT/SUBMITTED */}
          <div>
            <Label className="text-xs text-muted-foreground">Source</Label>
            {canEditSource ? (
              <Select value={claim.source} onValueChange={v => onUpdate('source', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-In</SelectItem>
                  <SelectItem value="PAPER">Paper</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="LEGACY">Legacy</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-foreground mt-1">{claim.source}</p>
            )}
          </div>

          {/* assigned_to — editable by supervisors */}
          <div>
            <Label className="text-xs text-muted-foreground">Assigned To</Label>
            {canEditAssignment ? (
              <Input
                value={claim.assigned_to || ''}
                onChange={e => onUpdate('assigned_to', e.target.value)}
                placeholder="Officer code"
                className="mt-1"
              />
            ) : (
              <p className="text-foreground mt-1">{claim.assigned_to || '(Unassigned)'}</p>
            )}
          </div>

          {/* workflow link */}
          {claim.workflow_instance_id && (
            <div>
              <Label className="text-xs text-muted-foreground">Workflow</Label>
              <Badge variant="outline" className="mt-1 font-mono text-xs">
                {claim.workflow_instance_id.slice(0, 8)}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
