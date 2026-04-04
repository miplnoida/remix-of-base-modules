/**
 * Schedule Action Bar — Bulk and schedule-level actions
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BnActionToolbar, BnToolbarGroup } from '@/components/bn/shared';
import { Loader2, X } from 'lucide-react';
import { useBnScheduleRowAction } from '@/hooks/bn/useBnSchedule';
import { SCHEDULE_ACTIONS } from '@/services/bn/scheduleService';

interface Props {
  selectedIds: string[];
  onClearSelection: () => void;
}

const bulkRowActions = SCHEDULE_ACTIONS.filter(a => a.scope === 'row' && a.bulk);

export const ScheduleActionBar: React.FC<Props> = ({ selectedIds, onClearSelection }) => {
  const rowAction = useBnScheduleRowAction();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [narrative, setNarrative] = useState('');

  const handleBulk = async (action: string) => {
    const def = bulkRowActions.find(a => a.action === action);
    if (def?.requiresNarrative) {
      setActiveAction(action);
      return;
    }
    for (const id of selectedIds) {
      try {
        await rowAction.mutateAsync({ rowId: id, action, performedBy: 'current-user' });
      } catch { /* individual failures logged */ }
    }
    onClearSelection();
  };

  const confirmBulk = async () => {
    if (!activeAction) return;
    for (const id of selectedIds) {
      try {
        await rowAction.mutateAsync({
          rowId: id,
          action: activeAction,
          narrative,
          performedBy: 'current-user',
        });
      } catch { /* continue */ }
    }
    setActiveAction(null);
    setNarrative('');
    onClearSelection();
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
        {bulkRowActions.map(a => (
          <Button
            key={a.action}
            variant={a.variant}
            size="sm"
            onClick={() => handleBulk(a.action)}
            disabled={rowAction.isPending}
          >
            {a.label}
          </Button>
        ))}
      </BnToolbarGroup>

      {activeAction && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">
            {bulkRowActions.find(a => a.action === activeAction)?.label} — {selectedIds.length} rows
          </p>
          <Textarea
            placeholder="Provide justification..."
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={2}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={confirmBulk} disabled={rowAction.isPending}>
              {rowAction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
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
