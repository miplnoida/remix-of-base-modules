import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBnScreenTemplates, useBnFieldMetadata } from '@/hooks/bn/useBnConfig';
import { useBnProductVersion, useUpdateBnProductVersion } from '@/hooks/bn/useBnProduct';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Monitor, ExternalLink, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ReadOnlyVersionBanner } from './ReadOnlyVersionBanner';
import { SMART_FIELD_TYPES } from '@/services/bn/registries';
import { APP_CHANNELS, type AppChannel } from './ScreenBuilder';

interface Props { versionId: string | undefined; isReadOnly?: boolean; versionStatus?: string | null; }

interface ScreenOverride {
  field_code: string;
  hide_channels?: AppChannel[];
  required_override?: boolean | null;
}

export function ScreenTemplateTab({ versionId, isReadOnly, versionStatus }: Props) {
  const { toast } = useToast();
  const { data: version } = useBnProductVersion(versionId);
  const { data: templates = [] } = useBnScreenTemplates();
  const updateMutation = useUpdateBnProductVersion();
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (version?.screen_template_id) setSelectedId(version.screen_template_id);
  }, [version]);

  const { data: fields = [] } = useBnFieldMetadata(selectedId || undefined);

  // Overrides live in version.review_policy._screen_overrides (DRAFT-only edits)
  const existingOverrides: ScreenOverride[] = useMemo(() => {
    return ((version as any)?.review_policy?._screen_overrides ?? []) as ScreenOverride[];
  }, [version]);
  const [overrides, setOverrides] = useState<ScreenOverride[]>(existingOverrides);
  useEffect(() => { setOverrides(existingOverrides); }, [existingOverrides]);

  if (!versionId) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Select or create a product version first.</CardContent></Card>;
  }

  const handleSave = async () => {
    try {
      const nextReview = { ...((version as any)?.review_policy ?? {}), _screen_overrides: overrides };
      await updateMutation.mutateAsync({ id: versionId, updates: { screen_template_id: selectedId || null, review_policy: nextReview } as any });
      toast({ title: 'Saved', description: 'Screen template assignment updated.' });
    } catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  const selected = templates.find((t: any) => t.id === selectedId);

  const getOverride = (code: string) => overrides.find(o => o.field_code === code);
  const setOverride = (code: string, patch: Partial<ScreenOverride>) => {
    setOverrides(prev => {
      const next = prev.filter(o => o.field_code !== code);
      const merged = { ...(prev.find(o => o.field_code === code) ?? { field_code: code }), ...patch };
      // drop if empty
      const isEmpty = (!merged.hide_channels || merged.hide_channels.length === 0)
        && (merged.required_override === null || merged.required_override === undefined);
      return isEmpty ? next : [...next, merged];
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Screen Template & Field Metadata</CardTitle>
          <CardDescription>Assign a reusable screen template from the Screen & Field Library. DRAFT versions may override field visibility/required per channel.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Link to="/bn/config/screen-setup">
            <Button variant="outline" size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> Open Library</Button>
          </Link>
          <Button onClick={handleSave} disabled={updateMutation.isPending || isReadOnly} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ReadOnlyVersionBanner show={!!isReadOnly} status={versionStatus} />

        <div className="space-y-2 max-w-md">
          <Label>Screen Template</Label>
          <Select disabled={isReadOnly} value={selectedId || '__none__'} onValueChange={(v) => setSelectedId(v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Select screen template from library" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None — required for intake</SelectItem>
              {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.template_name} ({t.template_code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selected.template_name}</span>
              <Badge variant="outline">{selected.layout_type}</Badge>
              <Badge variant="secondary">{Array.isArray(selected.sections) ? selected.sections.length : 0} sections</Badge>
              <Badge variant="secondary">{fields.length} fields</Badge>
            </div>
            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

            {fields.length > 0 && (
              <div className="mt-3">
                <Label className="text-xs uppercase">Fields & Per-Version Overrides</Label>
                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground mb-2">
                  <Info className="h-3 w-3 mt-0.5" />
                  Overrides apply only to this version and only while DRAFT.
                </p>
                <div className="rounded-md border divide-y">
                  {fields.map((f: any) => {
                    const ov = getOverride(f.field_code);
                    const ft = SMART_FIELD_TYPES.find(t => t.key === f.field_type);
                    const effectiveRequired = ov?.required_override ?? f.is_required;
                    return (
                      <div key={f.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 text-xs">
                        <div className="col-span-4">
                          <div className="font-medium">{f.field_label}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{f.field_code}</div>
                        </div>
                        <div className="col-span-2"><Badge variant="outline" className="text-[10px]">{ft?.label ?? f.field_type}</Badge></div>
                        <div className="col-span-3 flex flex-wrap gap-1">
                          {APP_CHANNELS.map(c => {
                            const baseVisible = ((f.validation_rules?.visible_for_channels as AppChannel[]) ?? APP_CHANNELS.map(x => x.key)).includes(c.key);
                            const hidden = ov?.hide_channels?.includes(c.key) ?? false;
                            const on = baseVisible && !hidden;
                            return (
                              <button
                                key={c.key}
                                type="button"
                                disabled={isReadOnly || !baseVisible}
                                onClick={() => {
                                  const cur = ov?.hide_channels ?? [];
                                  const next = cur.includes(c.key) ? cur.filter(x => x !== c.key) : [...cur, c.key];
                                  setOverride(f.field_code, { hide_channels: next });
                                }}
                                className={`rounded border px-1.5 py-0.5 ${on ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground line-through'}`}
                              >
                                {c.label.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                        <div className="col-span-3 flex items-center justify-end gap-2">
                          <Label className="text-[10px]">Required</Label>
                          <Switch
                            disabled={isReadOnly}
                            checked={!!effectiveRequired}
                            onCheckedChange={v => setOverride(f.field_code, { required_override: v === f.is_required ? null : v })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!selected && (
          <p className="text-sm text-muted-foreground">
            Open the <strong>Screen & Field Library</strong> to author reusable templates, then return here to assign one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
