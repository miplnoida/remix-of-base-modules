import React from 'react';
import { BookOpen, MessageCircleQuestion, Search, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHelpContext } from './HelpProvider';

interface ShortcutEntry {
  keys: string;
  description: string;
}

const DEFAULT_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Shift + ?', description: 'Screen help' },
  { keys: 'Ctrl + K', description: 'Search help' },
  { keys: 'Alt + F', description: 'Toggle FAQ' },
];

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

interface HelpToolbarProps {
  /** Additional shortcuts to show in the keyboard popover */
  extraShortcuts?: ShortcutEntry[];
  /** Extra buttons to render after the help buttons */
  children?: React.ReactNode;
}

export function HelpToolbar({ extraShortcuts = [], children }: HelpToolbarProps) {
  const { openHelp, openFAQ, setSearchOpen, faqs } = useHelpContext();

  const allShortcuts = [...DEFAULT_SHORTCUTS, ...extraShortcuts];

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={300}>
        {/* Help button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openHelp} data-help-button="true">
              <BookOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><span className="text-xs">Screen Help <kbd className="ml-1 text-[10px] font-mono bg-muted px-1 rounded">Shift+?</kbd></span></TooltipContent>
        </Tooltip>

        {/* FAQ button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={openFAQ}>
              <MessageCircleQuestion className="h-4 w-4" />
              {faqs.length > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center">
                  {faqs.length}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><span className="text-xs">FAQ <kbd className="ml-1 text-[10px] font-mono bg-muted px-1 rounded">Alt+F</kbd></span></TooltipContent>
        </Tooltip>

        {/* Search button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><span className="text-xs">Search Help <kbd className="ml-1 text-[10px] font-mono bg-muted px-1 rounded">Ctrl+K</kbd></span></TooltipContent>
        </Tooltip>

        {/* Shortcuts popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" title="Keyboard shortcuts" className="h-8 w-8">
              <Keyboard className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Keyboard Shortcuts</h4>
            <div className="space-y-2">
              {allShortcuts.map((s, i) => (
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
      </TooltipProvider>

      {children}
    </div>
  );
}
