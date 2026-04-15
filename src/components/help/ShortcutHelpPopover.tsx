import React from 'react';
import { Keyboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface ShortcutEntry {
  keys: string;
  description: string;
}

interface ShortcutHelpPopoverProps {
  shortcuts: ShortcutEntry[];
}

function formatKey(key: string) {
  return key.split('+').map((k, i) => (
    <React.Fragment key={i}>
      {i > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border rounded shadow-sm">
        {k.trim()}
      </kbd>
    </React.Fragment>
  ));
}

export function ShortcutHelpPopover({ shortcuts }: ShortcutHelpPopoverProps) {
  if (!shortcuts || shortcuts.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Keyboard shortcuts" className="h-8 w-8">
          <Keyboard className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Keyboard Shortcuts</h4>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground">{s.description}</span>
              <div className="flex items-center flex-shrink-0">
                {formatKey(s.keys)}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
