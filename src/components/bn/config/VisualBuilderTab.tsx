/**
 * VisualBuilderTab — drag-and-drop product version assembly workbench.
 * Layout: Section tabs · Palette | Canvas | Inspector + Validation/Preview below.
 * Read-only when the selected version is not DRAFT.
 */
import { useMemo, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  BlockPalette, ConfigBuilderCanvas, BlockInspector, ValidationPanel, PreviewPanel,
  useBuilderCanvas, newBlock, validateCanvas, EMPTY_CANVAS,
  type BuilderBlock, type BuilderSectionKey, type BuilderCanvas, type BuilderBlockKind,
} from '@/components/bn/config-builder';
import { BLOCK_REGISTRY } from '@/components/bn/config-builder/blockRegistry';

const SECTIONS: { key: BuilderSectionKey; label: string }[] = [
  { key: 'eligibility', label: 'Eligibility' },
  { key: 'calculation', label: 'Calculation' },
  { key: 'documents', label: 'Documents' },
  { key: 'screen', label: 'Form / Screen' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'communications', label: 'Communications' },
  { key: 'payments', label: 'Payments' },
  { key: 'servicing', label: 'Servicing' },
];

interface Props {
  versionId?: string;
  versionStatus?: string;
}

export function VisualBuilderTab({ versionId, versionStatus }: Props) {
  const { canvas, setCanvas, save, loading, saving } = useBuilderCanvas(versionId);
  const [section, setSection] = useState<BuilderSectionKey>('eligibility');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const readOnly = !!versionStatus && versionStatus.toUpperCase() !== 'DRAFT';
  const blocks = canvas.sections[section] ?? [];
  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedId), [blocks, selectedId]);
  const issues = useMemo(() => validateCanvas(canvas), [canvas]);

  const updateSectionBlocks = (next: BuilderBlock[]) => {
    setCanvas({ ...canvas, sections: { ...canvas.sections, [section]: next } });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = e;
    if (!over) return;
    const fromPalette = String(active.id).startsWith('palette:');
    const overSection = (over.data?.current?.section as BuilderSectionKey | undefined) ?? section;
    if (fromPalette) {
      const kind = (active.data?.current?.kind as BuilderBlockKind | undefined);
      if (!kind) return;
      const def = BLOCK_REGISTRY[kind];
      if (def.section !== overSection) {
        toast.error(`"${def.label}" belongs in the ${def.section} section`);
        return;
      }
      const blk = newBlock(kind);
      updateSectionBlocks([...(canvas.sections[overSection] ?? []), blk]);
      setSelectedId(blk.id);
      return;
    }
    // Reorder within section
    if (active.id !== over.id && !String(over.id).startsWith('canvas:')) {
      const oldIdx = blocks.findIndex((b) => b.id === active.id);
      const newIdx = blocks.findIndex((b) => b.id === over.id);
      if (oldIdx >= 0 && newIdx >= 0) updateSectionBlocks(arrayMove(blocks, oldIdx, newIdx));
    }
  };

  const onSave = async () => {
    try {
      await save(canvas);
      toast.success('Canvas saved');
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message });
    }
  };

  if (!versionId) {
    return <p className="text-sm text-muted-foreground p-4">Select a product version to use the Visual Builder.</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Visual Builder</CardTitle>
          <CardDescription>
            Drag reusable blocks into each section to assemble this product version.
            {readOnly && ' Version is read-only — clone to a DRAFT to edit.'}
          </CardDescription>
        </div>
        <Button onClick={onSave} disabled={saving || readOnly} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Canvas
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Tabs value={section} onValueChange={(v) => { setSection(v as BuilderSectionKey); setSelectedId(undefined); }}>
              <TabsList className="flex-wrap h-auto">
                {SECTIONS.map((s) => (
                  <TabsTrigger key={s.key} value={s.key} className="text-xs">
                    {s.label}
                    <span className="ml-1 text-[10px] text-muted-foreground">({(canvas.sections[s.key] ?? []).length})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-3"><BlockPalette section={section} disabled={readOnly} /></div>
                <div className="lg:col-span-6">
                  <ConfigBuilderCanvas
                    section={section}
                    blocks={blocks}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onRemove={(id) => updateSectionBlocks(blocks.filter((b) => b.id !== id))}
                    disabled={readOnly}
                  />
                </div>
                <div className="lg:col-span-3">
                  <BlockInspector
                    block={selectedBlock}
                    onChange={(next) => updateSectionBlocks(blocks.map((b) => (b.id === next.id ? next : b)))}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </DndContext>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ValidationPanel issues={issues} />
              <PreviewPanel canvas={canvas} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
