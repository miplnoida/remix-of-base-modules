import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Mail, BellRing, ListChecks, Archive, FileText } from 'lucide-react';
import { useExternalMessages } from '@/portals/_shared/externalHooks';
import { useSearchParams } from 'react-router-dom';

function MessageList({ items, emptyText }: { items: any[]; emptyText: string }) {
  if (items.length === 0) return <p className="px-1 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="divide-y">
      {items.map((m, i) => (
        <li key={i} className="flex items-start gap-3 py-3">
          <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{m.subject ?? m.template_code ?? 'Notification'}</p>
            <p className="text-xs text-muted-foreground truncate">{m.preview ?? m.body ?? ''}</p>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">{m.created_at ?? ''}</span>
        </li>
      ))}
    </ul>
  );
}

export default function NotificationsPage() {
  const { data, isLoading } = useExternalMessages();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'inbox';
  const msgs = (data?.messages ?? []) as any[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Notifications</CardTitle>
          <CardDescription>All messages, official letters, requests, and task reminders in one place.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="inbox" className="gap-1"><Inbox className="h-3.5 w-3.5" /> Inbox {msgs.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{msgs.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="letters" className="gap-1"><FileText className="h-3.5 w-3.5" /> Letters</TabsTrigger>
              <TabsTrigger value="notices" className="gap-1"><BellRing className="h-3.5 w-3.5" /> Notices</TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1"><ListChecks className="h-3.5 w-3.5" /> Tasks</TabsTrigger>
              <TabsTrigger value="archive" className="gap-1"><Archive className="h-3.5 w-3.5" /> Archive</TabsTrigger>
            </TabsList>

            {isLoading ? <Skeleton className="mt-4 h-32 w-full" /> : (
              <>
                <TabsContent value="inbox"><MessageList items={msgs} emptyText="You're all caught up." /></TabsContent>
                <TabsContent value="letters"><MessageList items={msgs.filter(m => String(m.channel ?? '').toUpperCase() === 'LETTER')} emptyText="No letters yet." /></TabsContent>
                <TabsContent value="notices"><MessageList items={msgs.filter(m => String(m.category ?? '').toUpperCase().includes('NOTICE'))} emptyText="No official notices." /></TabsContent>
                <TabsContent value="tasks"><MessageList items={msgs.filter(m => String(m.category ?? '').toUpperCase().includes('TASK'))} emptyText="No task reminders." /></TabsContent>
                <TabsContent value="archive"><MessageList items={msgs.filter(m => !!m.archived_at)} emptyText="Archive is empty." /></TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
