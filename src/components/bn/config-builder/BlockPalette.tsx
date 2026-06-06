/**
 * BlockPalette — left rail. Lists draggable blocks for the active section.
 * Uses @dnd-kit/core. Drag source: id=`palette:${kind}`.
 */
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { listBlocksForSection } from './blockRegistry';
import type { BuilderSectionKey, BlockDefinition } from './types';

interface Props { section: BuilderSectionKey; disabled?: boolean }

export function BlockPalette({ section, disabled }: Props) {
  const blocks = listBlocksForSection(section);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Block Palette</CardTitle>
        <p className="text-xs text-muted-foreground">Drag blocks into the canvas</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {blocks.length === 0 && <p className="text-xs text-muted-foreground">No blocks for this section yet.</p>}
        {blocks.map((b) => (
          <PaletteItem key={b.kind} def={b} disabled={disabled} />
        ))}
      </CardContent>
    </Card>
  );
}

function PaletteItem({ def, disabled }: { def: BlockDefinition; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${def.kind}`,
    data: { kind: def.kind, source: 'palette' },
    disabled,
  });
  const Icon = (Icons as any)[def.icon || 'Square'] ?? Icons.Square;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-start gap-2 p-2 border rounded-md bg-background hover:bg-accent ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab'} ${isDragging ? 'opacity-50' : ''}`}
    >
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{def.label}</div>
        {def.description && <div className="text-[10px] text-muted-foreground line-clamp-2">{def.description}</div>}
      </div>
      <Badge variant="outline" className="text-[9px]">{def.section}</Badge>
    </div>
  );
}
