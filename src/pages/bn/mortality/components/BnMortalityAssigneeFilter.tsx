/**
 * BN-MORT-UX-1 §3 — Searchable "Assigned to" combobox.
 *
 * Never displays a UUID. The selected UUID is stored internally only.
 * Options: All assignees • Unassigned • Assigned to me • eligible Benefits users.
 */
import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, RotateCcw, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import type { MortalityAssignableUser } from '@/hooks/bn/mortality/useMortalityQueries';

export type AssigneeMode =
  | { kind: 'all' }
  | { kind: 'unassigned' }
  | { kind: 'me' }
  | { kind: 'user'; userId: string };

interface Props {
  value: AssigneeMode;
  onChange: (v: AssigneeMode) => void;
  users: readonly MortalityAssignableUser[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  currentUserId: string | null;
}

export function BnMortalityAssigneeFilter({
  value, onChange, users, isLoading, isError, onRetry, currentUserId,
}: Props) {
  const [open, setOpen] = useState(false);

  const userById = useMemo(() => {
    const m = new Map<string, MortalityAssignableUser>();
    (users ?? []).forEach((u) => m.set(u.userId, u));
    return m;
  }, [users]);

  const label = useMemo(() => {
    if (value.kind === 'all') return 'All assignees';
    if (value.kind === 'unassigned') return 'Unassigned';
    if (value.kind === 'me') return 'Assigned to me';
    const u = userById.get(value.userId);
    return u?.displayName ?? 'Assigned user';
  }, [value, userById]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-label="Assigned to"
          aria-expanded={open}
          className="h-8 w-56 justify-between text-xs font-normal"
        >
          <span className="flex items-center gap-1.5 truncate">
            <UserCircle className="h-3.5 w-3.5 opacity-60" />
            <span className="truncate">{isLoading && value.kind === 'user' ? 'Loading staff…' : label}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search staff by name or code…" />
          <CommandList>
            <CommandGroup heading="Assignment">
              <ModeItem
                selected={value.kind === 'all'}
                onSelect={() => { onChange({ kind: 'all' }); setOpen(false); }}
                label="All assignees"
              />
              <ModeItem
                selected={value.kind === 'unassigned'}
                onSelect={() => { onChange({ kind: 'unassigned' }); setOpen(false); }}
                label="Unassigned"
              />
              <ModeItem
                selected={value.kind === 'me'}
                disabled={!currentUserId}
                onSelect={() => { if (currentUserId) { onChange({ kind: 'me' }); setOpen(false); } }}
                label="Assigned to me"
              />
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Benefits users">
              {isLoading ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">Loading staff…</div>
              ) : isError ? (
                <div className="flex items-center justify-between gap-2 px-2 py-3 text-xs">
                  <span className="text-muted-foreground">Staff list unavailable.</span>
                  <Button size="sm" variant="ghost" onClick={onRetry} className="h-6 px-2 text-xs">
                    <RotateCcw className="mr-1 h-3 w-3" /> Retry
                  </Button>
                </div>
              ) : !users || users.length === 0 ? (
                <CommandEmpty>No eligible staff found.</CommandEmpty>
              ) : (
                users.map((u) => {
                  const isSel = value.kind === 'user' && value.userId === u.userId;
                  const search = `${u.displayName} ${u.userCode ?? ''} ${u.roleNames.join(' ')}`;
                  return (
                    <CommandItem
                      key={u.userId}
                      value={search}
                      onSelect={() => { onChange({ kind: 'user', userId: u.userId }); setOpen(false); }}
                    >
                      <Check className={cn('mr-2 h-3.5 w-3.5', isSel ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">{u.displayName}</span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {u.userCode ? `${u.userCode} · ` : ''}
                          {u.roleNames.join(', ')}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ModeItem({
  selected, onSelect, label, disabled,
}: { selected: boolean; onSelect: () => void; label: string; disabled?: boolean }) {
  return (
    <CommandItem
      value={label}
      onSelect={disabled ? undefined : onSelect}
      className={disabled ? 'pointer-events-none opacity-50' : ''}
    >
      <Check className={cn('mr-2 h-3.5 w-3.5', selected ? 'opacity-100' : 'opacity-0')} />
      {label}
    </CommandItem>
  );
}
