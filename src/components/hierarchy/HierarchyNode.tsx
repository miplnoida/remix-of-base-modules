import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HierarchyNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  level: number;
  category?: string;
  isSystemRole?: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onAddChild: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
}

interface HierarchyNodeProps {
  data: HierarchyNodeData;
}

const HierarchyNode = ({ data }: HierarchyNodeProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onSelect(data.id);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-card shadow-md min-w-[180px] max-w-[240px] cursor-pointer transition-all",
        data.isSelected 
          ? "border-primary ring-2 ring-primary/20" 
          : "border-border hover:border-primary/50"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3 !border-2 !border-background"
      />
      
      <div className="flex flex-col gap-2">
        {/* Header with expand/collapse */}
        <div className="flex items-center gap-2">
          {data.hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpand(data.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {data.isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
          <span className="font-semibold text-sm text-foreground truncate flex-1">
            {data.name}
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            Level {data.level}
          </Badge>
          {data.category && (
            <Badge variant="secondary" className="text-xs">
              {data.category}
            </Badge>
          )}
          {data.isSystemRole && (
            <Badge variant="secondary" className="text-xs">
              System
            </Badge>
          )}
        </div>

        {/* Actions */}
        {data.canEdit && (
          <div className="flex gap-1 mt-1 border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                data.onEdit(data.id);
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                data.onAddChild(data.id);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Child
            </Button>
            {!data.hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRemove(data.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-3 !h-3 !border-2 !border-background"
      />
    </div>
  );
};

export default memo(HierarchyNode);
