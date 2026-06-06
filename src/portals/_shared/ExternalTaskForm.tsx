import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useExternalTask, useSubmitExternalTask } from './externalHooks';
import { toast } from 'sonner';

interface Props {
  taskId: string;
  taskToken?: string;
}

/**
 * ExternalTaskForm — renders a task's assigned form definition (from the
 * server) and submits the response. The exact same form definition is used
 * for staff intake and for these external portals — no field rules are
 * defined client-side.
 */
export function ExternalTaskForm({ taskId, taskToken }: Props) {
  const { data, isLoading, error } = useExternalTask(taskId, taskToken ? { taskToken } : undefined);
  const submit = useSubmitExternalTask(taskToken ? { taskToken } : undefined);
  const [values, setValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');

  const fields: any[] = useMemo(() => data?.formDefinition?.fields ?? [], [data]);
  const sections: any[] = useMemo(() => data?.formDefinition?.sections ?? [{ code: 'MAIN', label: 'Details' }], [data]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Alert variant="destructive"><AlertTitle>Could not load task</AlertTitle><AlertDescription>{(error as Error).message}</AlertDescription></Alert>;
  if (!data?.task) return <Alert><AlertTitle>Task not found</AlertTitle></Alert>;

  const task = data.task;
  const closed = ['ACCEPTED', 'CANCELLED', 'EXPIRED', 'SUBMITTED'].includes(task.status);

  const onSubmit = async () => {
    try {
      await submit.mutateAsync({ taskId, values, notes });
      toast.success('Response submitted. Internal review pending.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Submission failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{task.task_title}</CardTitle>
            <CardDescription>{task.task_description}</CardDescription>
          </div>
          <Badge variant={closed ? 'secondary' : 'default'}>{task.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((s: any) => {
          const code = s.code ?? s.section_code;
          const sectionFields = fields.filter(f => f.section_code === code);
          if (!sectionFields.length) return null;
          return (
            <div key={code} className="space-y-3">
              <h3 className="text-sm font-semibold">{s.label ?? s.title ?? code}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {sectionFields.map(f => (
                  <FieldRenderer key={f.id ?? f.field_code} field={f} value={values[f.field_code]} onChange={v => setValues(p => ({ ...p, [f.field_code]: v }))} disabled={closed} />
                ))}
              </div>
            </div>
          );
        })}
        {!fields.length && (
          <Alert><AlertTitle>No form configured</AlertTitle><AlertDescription>Provide notes and submit below.</AlertDescription></Alert>
        )}
        <div className="space-y-1.5">
          <Label>Notes for reviewer</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} disabled={closed} />
        </div>
        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={closed || submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit Response'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRenderer({ field, value, onChange, disabled }: { field: any; value: any; onChange: (v: any) => void; disabled?: boolean }) {
  const type = (field.field_type ?? 'TEXT').toUpperCase();
  const common = { disabled, value: value ?? '', onChange: (e: any) => onChange(e.target?.value ?? e) };
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {field.field_label}{field.is_required && <span className="text-destructive"> *</span>}
      </Label>
      {type === 'DATE' && <Input type="date" {...common} />}
      {type === 'NUMBER' || type === 'MONEY' ? <Input type="number" {...common} /> : null}
      {type === 'BOOLEAN' || type === 'DECLARATION_CHECKBOX' ? (
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!value} disabled={disabled} onChange={e => onChange(e.target.checked)} /> {field.help_text ?? 'I confirm'}</label>
      ) : null}
      {!['DATE', 'NUMBER', 'MONEY', 'BOOLEAN', 'DECLARATION_CHECKBOX'].includes(type) && <Input type="text" {...common} />}
      {field.help_text && <p className="text-[10px] text-muted-foreground">{field.help_text}</p>}
    </div>
  );
}
