/**
 * ConfigBuilderCanvas — center lane. Reorderable list per section.
 * Uses @dnd-kit/sortable; receives drops from BlockPalette.
 */
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, X } from 'lucide-react';
import { BLOCK_REGISTRY } from './blockRegistry';
import type { BuilderBlock, BuilderSectionKey } from './types';

interface Props {
  section: BuilderSectionKey;
  blocks: BuilderBlock[];
  selectedId?: string;
  onSelect: (id?: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function ConfigBuilderCanvas({ section, blocks, selectedId, onSelect, onRemove, disabled }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `canvas:${section}`, data: { section, target: 'canvas' } });
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm capitalize">{section} Canvas</CardTitle>
        <p className="text-xs text-muted-foreground">Drag blocks here, reorder by handle, click to inspect</p>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={`min-h-[300px] space-y-2 rounded-md border-2 border-dashed transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-muted'} p-3`}
      >
        {blocks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Drop blocks here</p>
        ) : (
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((b) => (
              <SortableBlock
                key={b.id}
                block={b}
                selected={selectedId === b.id}
                onSelect={() => onSelect(b.id)}
                onRemove={() => onRemove(b.id)}
                disabled={disabled}
              />
            ))}
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
}

function SortableBlock({ block, selected, onSelect, onRemove, disabled }: { block: BuilderBlock; selected: boolean; onSelect: () => void; onRemove: () => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, data: { source: 'canvas', kind: block.kind }, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const def = BLOCK_REGISTRY[block.kind];
  const summary = summarize(block);
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-2 p-2 border rounded-md bg-card ${selected ? 'ring-2 ring-primary' : ''} ${isDragging ? 'opacity-50' : ''} cursor-pointer`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="text-[10px] shrink-0">{def?.label ?? block.kind}</Badge>
      <div className="text-xs text-muted-foreground truncate flex-1">{summary}</div>
      {!disabled && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function summarize(block: BuilderBlock): string {
  const p = block.props ?? {};
  // Compact, type-aware one-liner
  const order = ['label', 'document_code', 'step_code', 'event_code', 'variable_key', 'policy_code', 'reason_code', 'field_type', 'role', 'target_role'];
  for (const k of order) if (p[k]) return `${k}: ${p[k]}`;
  const entries = Object.entries(p).slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  return entries.join(' · ') || '(no props)';
}
