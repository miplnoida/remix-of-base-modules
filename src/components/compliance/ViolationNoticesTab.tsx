import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bell, Send, CheckCircle, XCircle, MessageSquare, ChevronDown, Loader2, Eye, Truck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendNotice, markDelivered, recordAcknowledgment, recordResponse, cancelNotice, fetchDeliveryLog } from '@/services/noticeService';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-blue-500/15 text-blue-700',
  DELIVERED: 'bg-green-500/15 text-green-700',
  ACKNOWLEDGED: 'bg-emerald-500/15 text-emerald-700',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

function formatDate(val: string | null) {
  if (!val) return '-';
  try { return new Date(val).toLocaleDateString('en-GB'); } catch { return val; }
}

interface Props {
  violationId: string;
  employerId?: string;
  employerName?: string;
}

export function ViolationNoticesTab({ violationId }: Props) {
  const queryClient = useQueryClient();
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseDate, setResponseDate] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const userCode = 'system'; // Will be replaced by real user context

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['ce_notices_violation', violationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_notices')
        .select('*')
        .eq('violation_id', violationId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!violationId,
  });

  const { data: deliveryLogs = {} } = useQuery({
    queryKey: ['ce_delivery_logs', violationId],
    queryFn: async () => {
      const logMap: Record<string, any[]> = {};
      for (const n of notices) {
        const logs = await fetchDeliveryLog(n.id);
        logMap[n.id] = logs;
      }
      return logMap;
    },
    enabled: notices.length > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ce_notices_violation', violationId] });
    queryClient.invalidateQueries({ queryKey: ['ce_delivery_logs', violationId] });
  };

  const sendMut = useMutation({
    mutationFn: (id: string) => sendNotice(id, userCode),
    onSuccess: () => { invalidate(); toast.success('Notice sent'); },
    onError: (e: any) => toast.error('Failed to send notice', { description: e.message }),
  });

  const deliverMut = useMutation({
    mutationFn: (id: string) => markDelivered(id, userCode),
    onSuccess: () => { invalidate(); toast.success('Marked as delivered'); },
    onError: (e: any) => toast.error('Failed', { description: e.message }),
  });

  const ackMut = useMutation({
    mutationFn: (id: string) => recordAcknowledgment(id, userCode),
    onSuccess: () => { invalidate(); toast.success('Acknowledgment recorded'); },
    onError: (e: any) => toast.error('Failed', { description: e.message }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelNotice(id, 'Cancelled from violation detail', userCode),
    onSuccess: () => { invalidate(); toast.success('Notice cancelled'); },
    onError: (e: any) => toast.error('Failed', { description: e.message }),
  });

  const responseMut = useMutation({
    mutationFn: () => recordResponse(selectedNotice.id, responseNotes, responseDate, userCode),
    onSuccess: () => {
      invalidate();
      toast.success('Response recorded');
      setResponseOpen(false);
      setResponseNotes('');
      setResponseDate('');
    },
    onError: (e: any) => toast.error('Failed', { description: e.message }),
  });

  const getActions = (notice: any) => {
    const actions: { label: string; icon: any; onClick: () => void; variant?: any }[] = [];
    
    actions.push({ label: 'View', icon: Eye, onClick: () => { setSelectedNotice(notice); setViewOpen(true); } });
    
    if (notice.status === 'DRAFT') {
      actions.push({ label: 'Send', icon: Send, onClick: () => sendMut.mutate(notice.id) });
    }
    if (notice.status === 'SENT') {
      actions.push({ label: 'Mark Delivered', icon: Truck, onClick: () => deliverMut.mutate(notice.id) });
    }
    if (notice.status === 'DELIVERED') {
      actions.push({ label: 'Acknowledge', icon: CheckCircle, onClick: () => ackMut.mutate(notice.id) });
    }
    if (['DELIVERED', 'ACKNOWLEDGED'].includes(notice.status) && !notice.response_received) {
      actions.push({ label: 'Record Response', icon: MessageSquare, onClick: () => { setSelectedNotice(notice); setResponseOpen(true); } });
    }
    if (!['CANCELLED', 'ACKNOWLEDGED'].includes(notice.status)) {
      actions.push({ label: 'Cancel', icon: XCircle, onClick: () => cancelMut.mutate(notice.id), variant: 'destructive' });
    }
    
    return actions;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notices Issued ({notices.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No notices issued for this violation</div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice: any) => (
                <div key={notice.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{notice.notice_number}</span>
                        <Badge className={STATUS_COLORS[notice.status] || ''}>{notice.status}</Badge>
                        {notice.response_received && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">Response Received</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(notice.notice_type || '').replace(/_/g, ' ')} • {notice.delivery_method || '-'} • {formatDate(notice.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {getActions(notice).map((action, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                          onClick={action.onClick}
                          disabled={sendMut.isPending || deliverMut.isPending || ackMut.isPending || cancelMut.isPending}
                          className="text-xs"
                        >
                          <action.icon className="h-3 w-3 mr-1" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Log (collapsible) */}
                  {(deliveryLogs[notice.id]?.length ?? 0) > 0 && (
                    <Collapsible
                      open={expandedLogs[notice.id]}
                      onOpenChange={(open) => setExpandedLogs(prev => ({ ...prev, [notice.id]: open }))}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs mt-1 p-0 h-auto text-muted-foreground">
                          <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${expandedLogs[notice.id] ? 'rotate-180' : ''}`} />
                          Delivery Log ({deliveryLogs[notice.id]?.length})
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">#</TableHead>
                              <TableHead className="text-xs">Channel</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Sent</TableHead>
                              <TableHead className="text-xs">Delivered</TableHead>
                              <TableHead className="text-xs">By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deliveryLogs[notice.id]?.map((log: any) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs">{log.attempt_number}</TableCell>
                                <TableCell className="text-xs">{log.channel}</TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="outline" className="text-[10px]">{log.status}</Badge>
                                </TableCell>
                                <TableCell className="text-xs">{formatDate(log.sent_at)}</TableCell>
                                <TableCell className="text-xs">{formatDate(log.delivered_at)}</TableCell>
                                <TableCell className="text-xs">{log.created_by || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Notice Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notice Details</DialogTitle>
            <DialogDescription>{selectedNotice?.notice_number}</DialogDescription>
          </DialogHeader>
          {selectedNotice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Status</Label><div><Badge className={STATUS_COLORS[selectedNotice.status] || ''}>{selectedNotice.status}</Badge></div></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm font-medium">{(selectedNotice.notice_type || '').replace(/_/g, ' ')}</p></div>
                <div><Label className="text-xs text-muted-foreground">Delivery Method</Label><p className="text-sm font-medium">{selectedNotice.delivery_method || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Response Due</Label><p className="text-sm font-medium">{formatDate(selectedNotice.due_response_date)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Sent At</Label><p className="text-sm font-medium">{formatDate(selectedNotice.sent_at)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Delivered At</Label><p className="text-sm font-medium">{formatDate(selectedNotice.delivered_at)}</p></div>
              </div>
              {selectedNotice.subject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <Card className="mt-1"><CardContent className="py-3"><p className="text-sm font-medium">{selectedNotice.subject}</p></CardContent></Card>
                </div>
              )}
              {selectedNotice.body && (
                <div>
                  <Label className="text-xs text-muted-foreground">Body</Label>
                  <Card className="mt-1"><CardContent className="py-3"><pre className="text-sm whitespace-pre-wrap">{selectedNotice.body}</pre></CardContent></Card>
                </div>
              )}
              {selectedNotice.response_received && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-300 rounded-lg">
                  <Label className="text-xs text-emerald-700 font-semibold">Employer Response</Label>
                  <p className="text-sm mt-1">{selectedNotice.response_notes || 'No notes'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Received: {formatDate(selectedNotice.response_date)}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Response Dialog */}
      <Dialog open={responseOpen} onOpenChange={setResponseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Employer Response</DialogTitle>
            <DialogDescription>Notice: {selectedNotice?.notice_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Response Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={responseDate} onChange={e => setResponseDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Response Notes <span className="text-destructive">*</span></Label>
              <Textarea
                value={responseNotes}
                onChange={e => setResponseNotes(e.target.value)}
                rows={4}
                placeholder="Summary of employer's response..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseOpen(false)}>Cancel</Button>
            <Button
              onClick={() => responseMut.mutate()}
              disabled={!responseDate || !responseNotes || responseMut.isPending}
            >
              {responseMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
