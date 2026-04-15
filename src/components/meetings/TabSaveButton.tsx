import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';

interface TabSaveButtonProps {
  tabId: string;
  onSave?: (tabId: string) => Promise<void>;
  isDirty?: boolean;
  isSaving?: boolean;
  label?: string;
}

/**
 * Save button for individual tabs in the meeting workbench.
 * Only shows when there are unsaved changes in this tab.
 */
export function TabSaveButton({ tabId, onSave, isDirty = false, isSaving = false, label }: TabSaveButtonProps) {
  if (!onSave) return null;

  return (
    <div className="flex justify-end pt-4 border-t mt-6">
      <Button
        size="sm"
        onClick={() => onSave(tabId)}
        disabled={!isDirty || isSaving}
        className="gap-2"
        variant={isDirty ? 'default' : 'outline'}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {isSaving ? 'Saving...' : isDirty ? `Save ${label || 'Tab'}` : `${label || 'Tab'} Saved`}
      </Button>
    </div>
  );
}
