import { useEffect, useState } from 'react';
import ConsoleLayout from './ConsoleLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Globe2, Save } from 'lucide-react';
import type { TestEnvironment, ApiKey } from './types';

export default function EnvironmentsConsole() {
  const [envs, setEnvs] = useState<TestEnvironment[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [activeKey, setActiveKey] = useState<string>(() => localStorage.getItem('atc.activeEnvKey') || 'test');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: k }] = await Promise.all([
        supabase.from('api_test_environments').select('*').order('sort_order'),
        supabase.functions.invoke('manage-api-keys', { body: { action: 'list' } }),
      ]);
      setEnvs((e as any[]) || []);
      setKeys(k?.data || []);
      setLoading(false);
    })();
  }, []);

  const setActive = (envKey: string) => {
    setActiveKey(envKey);
    localStorage.setItem('atc.activeEnvKey', envKey);
    toast.success(`Active environment set to ${envKey.toUpperCase()}`);
  };

  const updateField = (id: string, patch: Partial<TestEnvironment>) => {
    setEnvs((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const save = async (env: TestEnvironment) => {
    setSaving(env.id);
    const { error } = await supabase
      .from('api_test_environments')
      .update({
        label: env.label,
        description: env.description,
        base_url: env.base_url,
        edge_functions_url: env.edge_functions_url,
        color_hex: env.color_hex,
        default_api_key_id: env.default_api_key_id,
        destructive_allowed: env.destructive_allowed,
        is_active: env.is_active,
      })
      .eq('id', env.id);
    setSaving(null);
    if (error) toast.error('Failed to save');
    else toast.success(`${env.label} updated`);
  };

  return (
    <ConsoleLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            <CardTitle className="text-base">Environment Management</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Two environments: Test (safe to break) and Live (production). Pick the active one — it is used as a <strong>fallback</strong> by the Runner. When an endpoint is mapped to an entry in <strong>API Settings → API Configuration</strong>, that base URL takes precedence and you do not need to configure it here.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {envs.map((env) => {
                const isActive = env.env_key === activeKey;
                return (
                  <div key={env.id} className={`rounded-lg border p-4 ${isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge style={{ backgroundColor: env.color_hex, color: 'white' }}>{env.label}</Badge>
                        {isActive && <Badge variant="outline">ACTIVE</Badge>}
                        {!env.destructive_allowed && <Badge variant="destructive">Destructive disabled</Badge>}
                      </div>
                      <Button size="sm" variant={isActive ? 'secondary' : 'outline'} onClick={() => setActive(env.env_key)} disabled={isActive}>
                        {isActive ? 'In use' : 'Use this environment'}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Field label="Label" value={env.label} onChange={(v) => updateField(env.id, { label: v })} />
                      <Field label="Description" value={env.description || ''} onChange={(v) => updateField(env.id, { description: v })} />
                      <Field label="Base URL" value={env.base_url} onChange={(v) => updateField(env.id, { base_url: v })} mono />
                      <Field label="Edge Functions URL" value={env.edge_functions_url} onChange={(v) => updateField(env.id, { edge_functions_url: v })} mono />
                      <Field label="Color" value={env.color_hex} onChange={(v) => updateField(env.id, { color_hex: v })} mono />

                      <div>
                        <Label className="text-xs">Default API Key</Label>
                        <select
                          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={env.default_api_key_id || ''}
                          onChange={(e) => updateField(env.id, { default_api_key_id: e.target.value || null })}
                        >
                          <option value="">— None selected —</option>
                          {keys.filter((k) => k.status === 'active').map((k) => (
                            <option key={k.id} value={k.id}>{k.app_name} ({k.key_prefix}…)</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between rounded-md border border-border p-2">
                        <Label htmlFor={`destr-${env.id}`} className="text-xs">Allow destructive tests</Label>
                        <Switch id={`destr-${env.id}`} checked={env.destructive_allowed} onCheckedChange={(c) => updateField(env.id, { destructive_allowed: c })} />
                      </div>

                      <Button size="sm" onClick={() => save(env)} disabled={saving === env.id} className="w-full">
                        <Save className="mr-1 h-4 w-4" /> {saving === env.id ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </ConsoleLayout>
  );
}

function Field({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 h-9 ${mono ? 'font-mono text-xs' : ''}`} />
    </div>
  );
}
