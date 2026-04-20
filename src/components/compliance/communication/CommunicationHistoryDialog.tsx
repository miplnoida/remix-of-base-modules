import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auditCommunicationInstanceService } from '@/services/auditCommunicationInstanceService';
import type { AuditCommunicationDelivery, AuditCommunicationEvent } from '@/types/auditCommunication';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  queued: 'outline', sent: 'default', delivered: 'default', opened: 'default',
  clicked: 'default', bounced: 'destructive', failed: 'destructive', suppressed: 'secondary',
};

export default function CommunicationHistoryDialog({
  communicationId, open, onClose,
}: { communicationId: string; open: boolean; onClose: () => void }) {
  const [deliveries, setDeliveries] = useState<AuditCommunicationDelivery[]>([]);
  const [events, setEvents] = useState<AuditCommunicationEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      auditCommunicationInstanceService.listDeliveries(communicationId),
      auditCommunicationInstanceService.listEvents(communicationId),
    ])
      .then(([d, e]) => { setDeliveries(d); setEvents(e); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open, communicationId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Delivery History</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="deliveries">
            <TabsList>
              <TabsTrigger value="deliveries">Deliveries ({deliveries.length})</TabsTrigger>
              <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="deliveries" className="space-y-2 mt-3">
              {deliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No delivery attempts yet.</p>
              ) : deliveries.map(d => (
                <div key={d.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusVariant[d.status] || 'outline'}>{d.status}</Badge>
                    <Badge variant="outline">{d.channel}</Badge>
                    <span className="font-mono text-xs">{d.recipient_address}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(d.attempted_at).toLocaleString()}</span>
                  </div>
                  {d.failure_reason && <p className="text-xs text-destructive mt-1">{d.failure_reason}</p>}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="events" className="space-y-2 mt-3">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No events.</p>
              ) : events.map(e => (
                <div key={e.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{e.event_type}</Badge>
                    {e.actor_name && <span className="text-xs">{e.actor_name}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  {e.payload && Object.keys(e.payload).length > 0 && (
                    <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{JSON.stringify(e.payload, null, 2)}</pre>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
