import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, X, Loader2 } from 'lucide-react';

interface Props {
  selectedCount: number;
  onIssue: () => void;
  onClear: () => void;
  isActing: boolean;
}

export const IssueActionBar: React.FC<Props> = ({ selectedCount, onIssue, onClear, isActing }) => (
  <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
    <span className="text-sm font-medium">
      {selectedCount} record{selectedCount !== 1 ? 's' : ''} selected
    </span>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
      <Button size="sm" onClick={onIssue} disabled={isActing} className="gap-1.5">
        {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
        Issue Selected
      </Button>
    </div>
  </div>
);
