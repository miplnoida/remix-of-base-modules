import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { AuditCommunicationTemplate } from '@/types/auditCommunication';
import { DEFAULT_PREVIEW_SAMPLE, renderMergeFields } from '@/lib/audit/communicationMergePreview';

export default function TemplatePreviewTab({ draft }: { draft: Partial<AuditCommunicationTemplate> }) {
  const baseSample = (draft.preview_sample_json && Object.keys(draft.preview_sample_json).length)
    ? draft.preview_sample_json
    : DEFAULT_PREVIEW_SAMPLE;
  const [sampleStr, setSampleStr] = useState(JSON.stringify(baseSample, null, 2));
  const [error, setError] = useState<string | null>(null);

  const sample = useMemo(() => {
    try { setError(null); return JSON.parse(sampleStr); }
    catch (e: any) { setError(e.message); return baseSample; }
  }, [sampleStr]);

  const subject = renderMergeFields(draft.email_subject, sample);
  const emailBody = renderMergeFields(draft.email_body, sample);
  const smsBody = renderMergeFields(draft.sms_body, sample);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <Label>Sample context (JSON)</Label>
          <Textarea rows={20} className="font-mono text-xs" value={sampleStr} onChange={(e) => setSampleStr(e.target.value)} />
          {error && <p className="text-xs text-destructive mt-1">JSON error: {error}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Badge variant="outline">Email subject</Badge>
            <p className="mt-1 font-medium">{subject || <span className="text-muted-foreground">—</span>}</p>
          </div>
          <div>
            <Badge variant="outline">Email body</Badge>
            <div className="mt-1 border rounded p-3 bg-muted/30 whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: emailBody || '<span class="text-muted-foreground">—</span>' }} />
          </div>
          <div>
            <Badge variant="outline">SMS body</Badge>
            <div className="mt-1 border rounded p-3 bg-muted/30 whitespace-pre-wrap text-sm">{smsBody || <span className="text-muted-foreground">—</span>}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
