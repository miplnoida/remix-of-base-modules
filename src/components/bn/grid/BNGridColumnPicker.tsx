import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Columns3, RotateCcw } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface Props<T> { table: Table<T>; onReset?: () => void; }

export function BNGridColumnPicker<T>({ table, onReset }: Props<T>) {
  const cols = table.getAllLeafColumns().filter((c) => c.id !== '__select__' && c.id !== '__actions__' && c.getCanHide());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Columns3 className="h-3.5 w-3.5" /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Toggle columns</span>
          {onReset && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onReset} title="Reset layout">
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 pb-2 space-y-1">
          {cols.map((c) => {
            const label = (c.columnDef.meta?.label as string) || (c.columnDef.header as string) || c.id;
            return (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted text-sm">
                <Checkbox checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)} />
                <span className="truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
