import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const RELATIONSHIPS = [
  'GUARDIAN', 'PAYEE', 'REPRESENTATIVE', 'BENEFICIARY', 'APPLICANT_FOR', 'MANAGED_CONTRIBUTOR',
] as const;

type Link = {
  id: string;
  user_id: string;
  ssn: string | null;
  relationship_type: string | null;
  verification_status: string | null;
  is_primary: boolean | null;
  notes: string | null;
};

export default function ManagedPeoplePage() {
  const qc = useQueryClient();
  const [ssn, setSsn] = useState('');
  const [rel, setRel] = useState<string>('GUARDIAN');
  const [notes, setNotes] = useState('');

  const { data: userId } = useQuery({
    queryKey: ['auth', 'uid'],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 60_000,
  });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['managed-links', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_user_person_link')
        .select('id, user_id, ssn, relationship_type, verification_status, is_primary, notes')
        .eq('user_id', userId!)
        .neq('relationship_type', 'SELF')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Link[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in.');
      if (!ssn.trim()) throw new Error('SSN is required.');
      const { error } = await supabase.from('external_user_person_link').insert({
        user_id: userId,
        ssn: ssn.trim(),
        relationship_type: rel,
        verification_status: 'PENDING',
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Relationship requested. Awaiting verification.');
      setSsn(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['managed-links'] });
    },
    onError: (e: any) => toast.error('Could not add relationship', { description: e?.message }),
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('external_user_person_link').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Relationship removed.');
      qc.invalidateQueries({ queryKey: ['managed-links'] });
    },
    onError: (e: any) => toast.error('Could not remove', { description: e?.message }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>People I Manage</CardTitle>
          <CardDescription>
            Add the people you act for as guardian, payee, representative, beneficiary, or applicant.
            New relationships start as <Badge variant="outline" className="ml-1">PENDING</Badge> and
            are unlocked after Social Security staff verify your supporting documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">SSN of the person</Label>
              <Input value={ssn} onChange={(e) => setSsn(e.target.value)} placeholder="e.g. 123456" />
            </div>
            <div>
              <Label className="text-xs">Your role</Label>
              <Select value={rel} onValueChange={setRel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Court order ref, etc." />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} className="gap-1">
              <Plus className="h-4 w-4" /> Request relationship
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Your relationships</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-24 w-full" /> : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No relationships on file yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SSN</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono">{l.ssn ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{l.relationship_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={l.verification_status === 'VERIFIED' ? 'default' : 'secondary'}>
                        {l.verification_status ?? 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.notes ?? ''}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-destructive"
                              onClick={() => delMutation.mutate(l.id)}
                              disabled={delMutation.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
