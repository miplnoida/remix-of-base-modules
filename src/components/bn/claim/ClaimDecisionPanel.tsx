import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useBnAvailableActions, useBnExecuteAction, useBnReasonCodes } from '@/hooks/bn/useBnDecisionEngine';
import { useUserCode } from '@/hooks/useUserCode';
import { BN_ACTION_VARIANTS } from '@/types/bn';
import type { BnAvailableAction, BnClaimTransitionRule } from '@/types/bn';
import { formatDateForStorage } from '@/lib/format-config';

interface ClaimDecisionPanelProps {
  claimId: string;
  userRoles: string[];
  productCategory?: string | null;
  countryCode?: string | null;
}

export function ClaimDecisionPanel({ claimId, userRoles, productCategory, countryCode }: ClaimDecisionPanelProps) {
  const { userCode } = useUserCode();
  const { data: actions = [], isLoading } = useBnAvailableActions(claimId, userRoles, productCategory, countryCode);
  const executeAction = useBnExecuteAction();

  const [selectedAction, setSelectedAction] = useState<BnAvailableAction | null>(null);
  const [reasonCodeId, setReasonCodeId] = useState<string>('');
  const [narrative, setNarrative] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>();

  const { data: reasonCodes = [] } = useBnReasonCodes(selectedAction?.rule.action_code);

  const handleExecute = async () => {
    if (!selectedAction || !userCode) return;
    const rule = selectedAction.rule;

    if (rule.requires_reason && !reasonCodeId) {
      toast.error('Please select a reason code');
      return;
    }
    if (rule.requires_narrative && !narrative.trim()) {
      toast.error('Please provide a narrative justification');
      return;
    }

    try {
      await executeAction.mutateAsync({
        claimId,
        actionCode: rule.action_code,
        ruleId: rule.id,
        reasonCodeId: reasonCodeId || null,
        narrative: narrative || null,
        effectiveDate: effectiveDate ? formatDateForStorage(effectiveDate) : null,
        performedBy: userCode,
      });
      toast.success(`Action "${rule.action_label}" completed successfully`);
      handleClose();
    } catch (err: any) {
      toast.error('Action failed', { description: err.message });
    }
  };

  const handleClose = () => {
    setSelectedAction(null);
    setReasonCodeId('');
    setNarrative('');
    setEffectiveDate(undefined);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading actions...</span>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) return null;

  const availableActions = actions.filter(a => !a.blocked);
  const blockedActions = actions.filter(a => a.blocked);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Decision Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <Button
                key={action.rule.id}
                variant={BN_ACTION_VARIANTS[action.rule.action_code] || 'default'}
                size="sm"
                onClick={() => setSelectedAction(action)}
              >
                {action.rule.action_label}
              </Button>
            ))}
            {blockedActions.map((action) => (
              <TooltipProvider key={action.rule.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="outline" size="sm" disabled>
                        {action.rule.action_label}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span>{action.blockedReason}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          {actions.some(a => a.rule.requires_maker_checker && !a.blocked) && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Some actions require maker-checker approval
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Execution Modal */}
      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAction?.rule.action_label}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedAction?.rule.from_status}</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge>{selectedAction?.rule.to_status}</Badge>
            </div>

            {selectedAction?.rule.requires_reason && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Reason Code *</label>
                <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonCodes.map(rc => (
                      <SelectItem key={rc.id} value={rc.id}>{rc.reason_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(selectedAction?.rule.requires_narrative || reasonCodes.find(r => r.id === reasonCodeId)?.requires_narrative) && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Narrative Justification *</label>
                <Textarea
                  value={narrative}
                  onChange={e => setNarrative(e.target.value)}
                  placeholder="Provide justification for this action..."
                  rows={3}
                />
              </div>
            )}

            {!selectedAction?.rule.requires_narrative && !selectedAction?.rule.requires_reason && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Comments (Optional)</label>
                <Textarea
                  value={narrative}
                  onChange={e => setNarrative(e.target.value)}
                  placeholder="Add any comments..."
                  rows={2}
                />
              </div>
            )}

            {/* Effective date - shown for status defs that require it */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Effective Date (Optional)</label>
              <DatePicker date={effectiveDate} onDateChange={setEffectiveDate} />
            </div>

            {selectedAction?.rule.requires_maker_checker && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-sm text-primary flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  This action requires maker-checker approval. A second approver will need to confirm.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              variant={BN_ACTION_VARIANTS[selectedAction?.rule.action_code || ''] || 'default'}
              onClick={handleExecute}
              disabled={executeAction.isPending}
            >
              {executeAction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {selectedAction?.rule.action_label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
