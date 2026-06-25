import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useMatter, useMatterChildren, useUpdateMatterStatus } from '@/hooks/legal-advanced/useLegalAdvancedData';

const NEXT_STATUS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['PENDING_REVIEW', 'CLOSED'],
  PENDING_REVIEW: ['IN_PROGRESS', 'CLOSED'],
};

export default function LAMatterDetail() {
  const { id } = useParams();
  const { data: matter, isLoading } = useMatter(id);
  const { parties, activity, documents } = useMatterChildren(id);
  const updateStatus = useUpdateMatterStatus();

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-32 w-full" /></div>;
  }
  if (!matter) {
    return <p className="text-sm text-muted-foreground">Matter not found.</p>;
  }

  const nextOptions = NEXT_STATUS[matter.status] || [];

  const transition = async (next: string) => {
    try {
      await updateStatus.mutateAsync({ id: matter.id, status: next });
      toast.success(`Status updated to ${next}`);
    } catch (e: any) {
      toast.error('Status update failed', { description: e?.message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/legal-advanced/matters"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">{matter.matter_no}</div>
          <h1 className="text-xl font-semibold">{matter.title}</h1>
        </div>
        <Badge>{matter.status}</Badge>
        <Badge variant="outline">{matter.category}</Badge>
        {matter.priority && <Badge variant="secondary">{matter.priority}</Badge>}
      </div>

      {nextOptions.length > 0 && (
        <div className="flex gap-2">
          {nextOptions.map((n) => (
            <Button key={n} size="sm" variant="outline" onClick={() => transition(n)} disabled={updateStatus.isPending}>
              {n.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parties">Parties ({parties.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({activity.data?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Field label="Origin" value={matter.origin} />
                <Field label="Stage" value={matter.stage} />
                <Field label="Source Module" value={matter.source_module} />
                <Field label="Source Ref No" value={matter.source_ref_no} />
                <Field label="Assignee" value={matter.assigned_user_code} />
                <Field label="Due Date" value={matter.due_date} />
                <Field label="Submitted" value={matter.submitted_at && new Date(matter.submitted_at).toLocaleString()} />
                <Field label="Accepted" value={matter.accepted_at && new Date(matter.accepted_at).toLocaleString()} />
                <Field label="Closed" value={matter.closed_at && new Date(matter.closed_at).toLocaleString()} />
              </dl>
              {matter.description && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <p className="text-sm whitespace-pre-wrap">{matter.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties" className="mt-4">
          <Card><CardContent className="pt-6">
            {parties.isLoading ? <Skeleton className="h-20 w-full" /> :
              parties.data?.length ? (
                <ul className="divide-y">
                  {parties.data.map((p: any) => (
                    <li key={p.id} className="py-2 text-sm flex justify-between">
                      <span>{p.party_name}</span>
                      <span className="text-muted-foreground text-xs">{p.party_role} • {p.party_type}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground text-center py-6">No parties yet.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card><CardContent className="pt-6">
            {documents.isLoading ? <Skeleton className="h-20 w-full" /> :
              documents.data?.length ? (
                <ul className="divide-y">
                  {documents.data.map((d: any) => (
                    <li key={d.id} className="py-2 text-sm flex justify-between">
                      <span>{d.doc_title}</span>
                      <span className="text-muted-foreground text-xs">v{d.version} • {d.doc_type || '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground text-center py-6">No documents yet.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card><CardContent className="pt-6">
            {activity.isLoading ? <Skeleton className="h-20 w-full" /> :
              activity.data?.length ? (
                <ul className="space-y-2">
                  {activity.data.map((a: any) => (
                    <li key={a.id} className="text-sm border-l-2 border-primary/40 pl-3">
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.activity_type} • {new Date(a.performed_at).toLocaleString()}
                        {a.performed_by_user_code && ` • ${a.performed_by_user_code}`}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}
