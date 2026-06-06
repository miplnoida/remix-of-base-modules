import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BLOCK_REGISTRY } from './blockRegistry';
import type { BuilderCanvas } from './types';

export function PreviewPanel({ canvas }: { canvas: BuilderCanvas }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="form">
          <TabsList className="h-8">
            <TabsTrigger value="form" className="text-xs">Internal Form</TabsTrigger>
            <TabsTrigger value="public" className="text-xs">Public Form</TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs">Workflow Path</TabsTrigger>
            <TabsTrigger value="docs" className="text-xs">Doc Checklist</TabsTrigger>
            <TabsTrigger value="comms" className="text-xs">Comms</TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="pt-3"><ScreenPreview canvas={canvas} channel="INTERNAL" /></TabsContent>
          <TabsContent value="public" className="pt-3"><ScreenPreview canvas={canvas} channel="PUBLIC" /></TabsContent>
          <TabsContent value="workflow" className="pt-3"><WorkflowPreview canvas={canvas} /></TabsContent>
          <TabsContent value="docs" className="pt-3"><DocPreview canvas={canvas} /></TabsContent>
          <TabsContent value="comms" className="pt-3"><CommPreview canvas={canvas} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ScreenPreview({ canvas, channel }: { canvas: BuilderCanvas; channel: 'INTERNAL' | 'PUBLIC' }) {
  const blocks = canvas.sections.screen.filter(
    (b) => b.kind === 'screen.section' || (b.kind === 'screen.field' && (channel === 'INTERNAL' || (b.props?.visible_channels ?? []).includes('PUBLIC'))),
  );
  if (!blocks.length) return <Empty />;
  return (
    <div className="space-y-2 text-xs">
      {blocks.map((b) => (
        <div key={b.id} className="border rounded p-2">
          <Badge variant="outline" className="text-[9px] mr-2">{BLOCK_REGISTRY[b.kind].label}</Badge>
          {b.props?.title || b.props?.label || '(unnamed)'}
        </div>
      ))}
    </div>
  );
}
function WorkflowPreview({ canvas }: { canvas: BuilderCanvas }) {
  const steps = canvas.sections.workflow.filter((b) => b.kind === 'workflow.step');
  if (!steps.length) return <Empty />;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <span key={s.id} className="flex items-center gap-1">
          <Badge>{s.props?.step_code || '(no code)'}</Badge>
          <span className="text-muted-foreground">{s.props?.role}</span>
          {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
        </span>
      ))}
    </div>
  );
}
function DocPreview({ canvas }: { canvas: BuilderCanvas }) {
  const docs = canvas.sections.documents.filter((b) => b.kind === 'document.required');
  if (!docs.length) return <Empty />;
  return (
    <ul className="space-y-1 text-xs">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center gap-2">
          <Badge variant={d.props?.requirement === 'REQUIRED' ? 'default' : 'outline'} className="text-[9px]">{d.props?.requirement}</Badge>
          <span className="font-mono">{d.props?.document_code || '(no code)'}</span>
          <span className="text-muted-foreground">@ {d.props?.stage}</span>
        </li>
      ))}
    </ul>
  );
}
function CommPreview({ canvas }: { canvas: BuilderCanvas }) {
  const evs = canvas.sections.communications.filter((b) => b.kind === 'comm.event');
  if (!evs.length) return <Empty />;
  return (
    <ul className="space-y-1 text-xs">
      {evs.map((e) => (
        <li key={e.id}>
          <Badge variant="outline" className="text-[9px] mr-1">{e.props?.delivery_method}</Badge>
          <span className="font-mono">{e.props?.event_code}</span>
          <span className="text-muted-foreground"> → {e.props?.recipient_type}</span>
        </li>
      ))}
    </ul>
  );
}
function Empty() { return <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>; }
