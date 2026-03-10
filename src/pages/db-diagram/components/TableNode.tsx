import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key, Link2, Eye, Table2 } from 'lucide-react';
import { type DbColumn, shortDataType } from '@/services/dbDiagramService';

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
    columns: DbColumn[];
    color: string;
    categoryLabel: string;
    isSelected: boolean;
    onClick: () => void;
  };
}

export const TableNode = memo(({ data }: TableNodeProps) => {
  const { table, columns, color, categoryLabel, isSelected, onClick } = data;
  const maxShow = 15;
  const displayCols = columns.slice(0, maxShow);
  const remaining = columns.length - maxShow;

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border-2 bg-card shadow-lg cursor-pointer transition-all
        hover:shadow-xl select-none
        ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
      `}
      style={{ borderColor: color, minWidth: 260, maxWidth: 320 }}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !-top-1.5 !bg-primary !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !-bottom-1.5 !bg-primary !border-2 !border-background" />
      <Handle type="target" position={Position.Left} id="left-in" className="!w-3 !h-3 !-left-1.5 !bg-primary !border-2 !border-background" />
      <Handle type="source" position={Position.Right} id="right-out" className="!w-3 !h-3 !-right-1.5 !bg-primary !border-2 !border-background" />

      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md flex items-center justify-between gap-2"
        style={{ backgroundColor: color, color: '#fff' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {table.is_view ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <Table2 className="h-3.5 w-3.5 shrink-0" />}
          <span className="text-xs font-bold truncate">{table.table_name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {table.is_shared && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-white/20 leading-none">SHARED</span>
          )}
          <span className="text-[8px] px-1 py-0.5 rounded bg-white/20 leading-none">{categoryLabel}</span>
        </div>
      </div>

      {/* Column List */}
      <div className="divide-y divide-border">
        {displayCols.length === 0 && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground italic">Loading columns...</div>
        )}
        {displayCols.map((col, i) => (
          <div
            key={col.column_name}
            className={`px-3 py-1 flex items-center gap-2 text-[11px] ${
              i === 0 ? '' : ''
            } hover:bg-muted/50`}
          >
            {/* Icon */}
            <span className="w-3.5 shrink-0 flex justify-center">
              {col.is_primary_key ? (
                <Key className="h-3 w-3 text-amber-500" />
              ) : col.is_foreign_key ? (
                <Link2 className="h-3 w-3 text-blue-500" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              )}
            </span>
            {/* Name */}
            <span className={`flex-1 font-mono truncate ${
              col.is_primary_key ? 'font-bold text-foreground' : 
              col.is_foreign_key ? 'font-semibold text-foreground' : 'text-muted-foreground'
            }`}>
              {col.column_name}
            </span>
            {/* Type */}
            <span className="text-[10px] text-muted-foreground font-mono shrink-0 px-1 py-0.5 bg-muted rounded">
              {shortDataType(col.data_type)}
            </span>
            {/* Nullable */}
            {!col.is_nullable && (
              <span className="text-[8px] text-destructive font-bold shrink-0">NN</span>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <div className="px-3 py-1 text-[10px] text-muted-foreground text-center italic">
            + {remaining} more columns
          </div>
        )}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
