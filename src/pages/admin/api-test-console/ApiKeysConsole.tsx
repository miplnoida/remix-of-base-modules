import { useEffect, useState } from 'react';
import ConsoleLayout from './ConsoleLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';
import { KeyRound, Plus, Eye, RefreshCw, Trash2, Copy, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface ApiKeyRow {
  id: string;
  app_name: string;
  key_prefix: string;
  status: string;
  rate_limit_per_minute: number;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default function ApiKeysConsole() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genName, setGenName] = useState('');
  const [genRate, setGenRate] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [revealedFor, setRevealedFor] = useState<ApiKeyRow | null>(null);
  const [revoking, setRevoking] = useState<ApiKeyRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-api-keys', { body: { action: 'list' } });
    if (error || data?.status !== 'success') {
      toast.error('Failed to load API keys');
    } else {
      setKeys(data.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!genName.trim()) { toast.error('Application name is required'); return; }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke('manage-api-keys', {
      body: { action: 'generate', app_name: genName.trim(), rate_limit_per_minute: genRate },
    });
    setGenerating(false);
    if (error || data?.status !== 'success') {
      toast.error(data?.message || 'Failed to generate key');
      return;
    }
    const plainKey = data?.data?.plain_key || null;
    setRevealKey(plainKey);
    setRevealedFor({ id: data?.data?.id || crypto.randomUUID(), app_name: genName, key_prefix: plainKey?.slice(0, 8) || '', status: 'active', rate_limit_per_minute: genRate, expires_at: null, created_at: new Date().toISOString(), revoked_at: null });
    setGenerateOpen(false);
    setGenName('');
    load();
  };

  const handleReveal = async (k: ApiKeyRow) => {
    setBusyId(k.id);
    const { data, error } = await supabase.functions.invoke('manage-api-keys', { body: { action: 'reveal', key_id: k.id } });
    setBusyId(null);
    if (error || data?.status !== 'success') {
      toast.error(data?.message || 'Reveal failed');
      return;
    }
    setRevealKey(data?.data?.plain_key || null);
    setRevealedFor(k);
    if (data?.data?.regenerated) toast.warning('Key was rotated automatically — old value invalidated.');
  };

  const handleRegenerate = async (k: ApiKeyRow) => {
    setBusyId(k.id);
    const { data, error } = await supabase.functions.invoke('manage-api-keys', { body: { action: 'regenerate', key_id: k.id } });
    setBusyId(null);
    if (error || data?.status !== 'success') { toast.error('Regenerate failed'); return; }
    setRevealKey(data?.data?.plain_key || null);
    setRevealedFor(k);
    load();
  };

  const handleRevoke = async () => {
    if (!revoking) return;
    const { data, error } = await supabase.functions.invoke('manage-api-keys', { body: { action: 'revoke', key_id: revoking.id } });
    if (error || data?.status !== 'success') { toast.error('Revoke failed'); return; }
    toast.success(`"${revoking.app_name}" has been revoked`);
    setRevoking(null);
    load();
  };

  const filtered = keys.filter((k) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return k.app_name.toLowerCase().includes(f) || k.key_prefix.toLowerCase().includes(f) || k.status.toLowerCase().includes(f);
  });

  return (
    <ConsoleLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <CardTitle className="text-base">API Key Management</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Filter by name, prefix, status…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-64" />
            <Button onClick={() => setGenerateOpen(true)}><Plus className="mr-1 h-4 w-4" /> Generate Key</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rate / min</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No API keys found.</TableCell></TableRow>
              ) : filtered.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.app_name}</TableCell>
                  <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{k.key_prefix}…</code></TableCell>
                  <TableCell>
                    <Badge variant={k.status === 'active' ? 'default' : 'secondary'} className={k.status === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>{k.status}</Badge>
                  </TableCell>
                  <TableCell>{k.rate_limit_per_minute}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(k.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{k.expires_at ? format(new Date(k.expires_at), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" disabled={busyId === k.id || k.status !== 'active'} onClick={() => handleReveal(k)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" disabled={busyId === k.id || k.status !== 'active'} onClick={() => handleRegenerate(k)}><RefreshCw className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" disabled={k.status !== 'active'} onClick={() => setRevoking(k)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>The full key will be shown once. Copy and store it securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Application name</label>
              <Input value={genName} onChange={(e) => setGenName(e.target.value)} placeholder="e.g. Compliance Mobile App" />
            </div>
            <div>
              <label className="text-xs font-medium">Rate limit (requests / min)</label>
              <Input type="number" value={genRate} onChange={(e) => setGenRate(parseInt(e.target.value) || 60)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>{generating ? 'Generating…' : 'Generate'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal dialog */}
      <Dialog open={!!revealKey} onOpenChange={(o) => { if (!o) { setRevealKey(null); setRevealedFor(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /> API Key Value</DialogTitle>
            <DialogDescription>Treat this value as a password. It will not be shown unmasked again unless explicitly revealed by an admin.</DialogDescription>
          </DialogHeader>
          {revealedFor && <p className="text-xs text-muted-foreground">For: <span className="font-medium">{revealedFor.app_name}</span></p>}
          <div className="rounded-md border border-border bg-muted p-3">
            <code className="block break-all text-xs">{revealKey}</code>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`X-API-Key: ${revealKey}`); toast.success('cURL header copied'); }}><Copy className="mr-1 h-4 w-4" /> Copy header</Button>
            <Button onClick={() => { navigator.clipboard.writeText(revealKey || ''); toast.success('Key copied'); }}><Copy className="mr-1 h-4 w-4" /> Copy key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={`Revoke "${revoking?.app_name}"?`}
        description="This immediately disables the API key. Any application using it will start receiving 401 responses. This cannot be undone."
        confirmLabel="Revoke key"
        variant="destructive"
        onConfirm={handleRevoke}
      />
    </ConsoleLayout>
  );
}
