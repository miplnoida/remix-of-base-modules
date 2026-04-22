import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ConsoleLayout from './ConsoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FlaskConical } from 'lucide-react';
import type { SavedTestCase } from './types';

const CATEGORIES = ['auth', 'compliance', 'cases', 'inspections', 'employers', 'misc'];
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const empty: Partial<SavedTestCase> = {
  name: '',
  description: '',
  category: 'compliance',
  http_method: 'GET',
  endpoint_path: '',
  requires_auth: true,
  requires_api_key: true,
  is_destructive: false,
  is_active: true,
  expected_status: 200,
};

export default function SavedCasesConsole() {
  const [items, setItems] = useState<SavedTestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SavedTestCase>>(empty);
  const [bodyText, setBodyText] = useState('');
  const [headersText, setHeadersText] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_test_saved_cases')
      .select('*')
      .order('category')
      .order('name');
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditing({ ...empty });
    setBodyText('');
    setHeadersText('');
    setOpen(true);
  }
  function startEdit(c: SavedTestCase) {
    setEditing(c);
    setBodyText(c.default_body ? JSON.stringify(c.default_body, null, 2) : '');
    setHeadersText(c.default_headers ? JSON.stringify(c.default_headers, null, 2) : '');
    setOpen(true);
  }

  async function save() {
    if (!editing.name?.trim() || !editing.endpoint_path?.trim()) {
      toast.error('Name and endpoint path are required');
      return;
    }
    let parsedBody: any = null;
    let parsedHeaders: any = null;
    try { parsedBody = bodyText.trim() ? JSON.parse(bodyText) : null; }
    catch { toast.error('Default body is not valid JSON'); return; }
    try { parsedHeaders = headersText.trim() ? JSON.parse(headersText) : null; }
    catch { toast.error('Default headers is not valid JSON'); return; }

    const payload: any = {
      name: editing.name,
      description: editing.description || null,
      category: editing.category || 'misc',
      http_method: editing.http_method || 'GET',
      endpoint_path: editing.endpoint_path,
      requires_auth: !!editing.requires_auth,
      requires_api_key: !!editing.requires_api_key,
      is_destructive: !!editing.is_destructive,
      is_active: editing.is_active !== false,
      expected_status: editing.expected_status ?? null,
      default_body: parsedBody,
      default_headers: parsedHeaders,
    };

    const { error } = (editing as any).id
      ? await supabase.from('api_test_saved_cases').update(payload).eq('id', (editing as any).id)
      : await supabase.from('api_test_saved_cases').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this test case?')) return;
    const { error } = await supabase.from('api_test_saved_cases').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    load();
  }

  const filtered = items.filter(c => {
    if (filterCat !== 'all' && c.category !== filterCat) return false;
    if (search && !`${c.name} ${c.endpoint_path}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <ConsoleLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" /> Saved Test Cases</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Reusable, parameterized API test definitions used by suites and the runner.</p>
          </div>
          <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Test Case</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search by name or path…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No saved cases yet.</TableCell></TableRow>
                )}
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{c.http_method}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{c.endpoint_path}</TableCell>
                    <TableCell>{c.expected_status ?? '—'}</TableCell>
                    <TableCell className="space-x-1">
                      {c.requires_auth && <Badge variant="outline" className="text-xs">auth</Badge>}
                      {c.requires_api_key && <Badge variant="outline" className="text-xs">key</Badge>}
                      {c.is_destructive && <Badge variant="destructive" className="text-xs">destructive</Badge>}
                      {!c.is_active && <Badge variant="outline" className="text-xs">inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{(editing as any).id ? 'Edit Test Case' : 'New Test Case'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>HTTP Method</Label>
              <Select value={editing.http_method} onValueChange={v => setEditing({ ...editing, http_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Endpoint Path</Label>
              <Input placeholder="/functions/v1/compliance-cases" value={editing.endpoint_path || ''} onChange={e => setEditing({ ...editing, endpoint_path: e.target.value })} />
            </div>
            <div>
              <Label>Expected Status</Label>
              <Input type="number" value={editing.expected_status ?? ''} onChange={e => setEditing({ ...editing, expected_status: e.target.value ? parseInt(e.target.value) : null })} />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2"><Switch checked={!!editing.requires_auth} onCheckedChange={v => setEditing({ ...editing, requires_auth: v })} /><Label>Auth</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.requires_api_key} onCheckedChange={v => setEditing({ ...editing, requires_api_key: v })} /><Label>API key</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.is_destructive} onCheckedChange={v => setEditing({ ...editing, is_destructive: v })} /><Label>Destructive</Label></div>
            </div>
            <div className="col-span-2">
              <Label>Default Headers (JSON)</Label>
              <Textarea rows={3} className="font-mono text-xs" value={headersText} onChange={e => setHeadersText(e.target.value)} placeholder='{"Content-Type":"application/json"}' />
            </div>
            <div className="col-span-2">
              <Label>Default Body (JSON)</Label>
              <Textarea rows={5} className="font-mono text-xs" value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder='{"key":"value"}' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsoleLayout>
  );
}
