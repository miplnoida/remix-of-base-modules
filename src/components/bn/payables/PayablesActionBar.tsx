/**
 * Payables Action Bar — Sticky bar for bulk actions on selected payable instructions
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BnActionToolbar, BnToolbarGroup } from '@/components/bn/shared';
import { Loader2, X } from 'lucide-react';
import { useBnBulkPayableAction } from '@/hooks/bn/useBnPayablesQueue';
import { PAYABLE_ACTIONS } from '@/services/bn/payablesQueueService';

interface Props {
  selectedIds: string[];
  onClearSelection: () => void;
}

const bulkActions = PAYABLE_ACTIONS.filter(a => a.bulk);

export const PayablesActionBar: React.FC<Props> = ({ selectedIds, onClearSelection }) => {
  const bulkMutation = useBnBulkPayableAction();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [narrative, setNarrative] = useState('');

  const handleBulk = (action: string) => {
    const def = bulkActions.find(a => a.action === action);
    if (def?.requiresNarrative) {
      setActiveAction(action);
      return;
    }
    bulkMutation.mutate({
      ids: selectedIds,
      action,
      performedBy: 'current-user',
    }, { onSuccess: onClearSelection });
  };

  const confirmBulk = () => {
    if (!activeAction) return;
    bulkMutation.mutate({
      ids: selectedIds,
      action: activeAction,
      performedBy: 'current-user',
      narrative,
    }, {
      onSuccess: () => {
        setActiveAction(null);
        setNarrative('');
        onClearSelection();
      },
    });
  };

  return (
    <BnActionToolbar sticky>
      <BnToolbarGroup>
        <span className="text-sm font-medium">{selectedIds.length} selected</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearSelection}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </BnToolbarGroup>

      <BnToolbarGroup>
        {bulkActions.map(a => (
          <Button
            key={a.action}
            variant={a.variant}
            size="sm"
            onClick={() => handleBulk(a.action)}
            disabled={bulkMutation.isPending}
          >
            {a.label}
          </Button>
        ))}
      </BnToolbarGroup>

      {activeAction && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">
            {bulkActions.find(a => a.action === activeAction)?.label} — {selectedIds.length} items
          </p>
          <Textarea
            placeholder="Provide justification..."
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={2}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={confirmBulk} disabled={bulkMutation.isPending}>
              {bulkMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setActiveAction(null); setNarrative(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </BnActionToolbar>
  );
};
