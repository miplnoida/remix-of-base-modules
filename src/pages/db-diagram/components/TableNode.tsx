import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Table2, Key, Link2, Eye } from 'lucide-react';

interface TableNodeProps {
  data: {
    table: {
      table_name: string;
      table_category: string;
      is_shared: boolean;
      is_view: boolean;
      primary_key_summary: string | null;
      foreign_key_summary: string | null;
    };
    color: string;
    categoryLabel: string;
    isSelected: boolean;
    onClick: () => void;
  };
}

export const TableNode = memo(({ data }: TableNodeProps) => {
  const { table, color, categoryLabel, isSelected, onClick } = data;

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border-2 bg-card shadow-md cursor-pointer transition-all
        hover:shadow-lg min-w-[240px]
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />

      {/* Header */}
      <div
        className="px-3 py-1.5 rounded-t-md flex items-center justify-between"
        style={{ backgroundColor: color + '18' }}
      >
        <div className="flex items-center gap-1.5">
          {table.is_view ? (
            <Eye className="h-3.5 w-3.5" style={{ color }} />
          ) : (
            <Table2 className="h-3.5 w-3.5" style={{ color }} />
          )}
          <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
            {table.table_name}
          </span>
        </div>
        {table.is_shared && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Shared
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: color + '20', color }}
          >
            {categoryLabel}
          </span>
        </div>
        {table.primary_key_summary && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Key className="h-3 w-3 text-amber-500" />
            <span className="truncate">{table.primary_key_summary}</span>
          </div>
        )}
        {table.foreign_key_summary && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Link2 className="h-3 w-3 text-indigo-500" />
            <span className="truncate">
              {table.foreign_key_summary.split(',').length} FK(s)
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
