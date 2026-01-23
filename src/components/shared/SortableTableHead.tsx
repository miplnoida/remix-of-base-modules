import React from 'react';
import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortDirection } from '@/hooks/useTableSort';

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSortKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export const SortableTableHead: React.FC<SortableTableHeadProps> = ({
  children,
  sortKey,
  currentSortKey,
  direction,
  onSort,
  className,
}) => {
  const isActive = sortKey === currentSortKey && direction !== null;

  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50 transition-colors', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="ml-1">
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </span>
      </div>
    </TableHead>
  );
};
