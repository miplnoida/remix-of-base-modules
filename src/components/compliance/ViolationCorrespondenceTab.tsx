import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, FileText, Loader2, Inbox } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ViolationCorrespondenceTabProps {
  violationId: string;
  employerId?: string;
  employerName?: string;
}

export function ViolationCorrespondenceTab({ violationId, employerId, employerName }: ViolationCorrespondenceTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLogCallDialog, setShowLogCallDialog] = useState(false);
  const [showSendLetterDialog, setShowSendLetterDialog] = useState(false);
  const [callForm, setCallForm] = useState({ direction: 'Outgoing', contactPerson: '', summary: '' });
  const [letterForm, setLetterForm] = useState({ template: '', deliveryMethod: 'letter', notes: '' });

  const { data: correspondence = [], isLoading } = useQuery({
    queryKey: ['ce_violation_correspondence', violationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_violation_correspondence')
        .select('*')
        .eq('violation_id', violationId)
        .order('correspondence_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const logCallMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ce_violation_correspondence').insert({
        violation_id: violationId,
        correspondence_date: new Date().toISOString().split('T')[0],
        channel: 'Call',
        direction: callForm.direction,
        subject: 'Phone Call',
        status: 'Completed',
        summary: callForm.summary,
        contact_person: callForm.contactPerson,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_correspondence', violationId] });
      toast({ title: 'Call Logged', description: 'Call record created and linked to violation' });
      setShowLogCallDialog(false);
      setCallForm({ direction: 'Outgoing', contactPerson: '', summary: '' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to log call', variant: 'destructive' }),
  });

  const sendLetterMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ce_violation_correspondence').insert({
        violation_id: violationId,
        correspondence_date: new Date().toISOString().split('T')[0],
        channel: letterForm.deliveryMethod === 'email' ? 'Email' : letterForm.deliveryMethod === 'both' ? 'Letter, Email' : 'Letter',
        direction: 'Outgoing',
        subject: letterForm.template || 'Custom Letter',
        status: 'Queued',
        summary: letterForm.notes || `Template: ${letterForm.template}`,
        contact_person: employerName || '',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_violation_correspondence', violationId] });
      toast({ title: 'Letter Queued', description: 'Correspondence record created and queued for delivery' });
      setShowSendLetterDialog(false);
      setLetterForm({ template: '', deliveryMethod: 'letter', notes: '' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to queue letter', variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Communication Actions</CardTitle>
          <p className="text-sm text-muted-foreground">All communications are tracked through the central correspondence system</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowLogCallDialog(true)}><Phone className="h-4 w-4 mr-2" />Log Call</Button>
            <Button variant="outline" onClick={() => setShowSendLetterDialog(true)}><Mail className="h-4 w-4 mr-2" />Send Letter / Email</Button>
            <Button variant="outline"><FileText className="h-4 w-4 mr-2" />Generate Notice</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Correspondence History</CardTitle>
          <p className="text-sm text-muted-foreground">All correspondence linked to this violation and employer</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : correspondence.length === 0 ? (
            <div className="flex flex-col items-center py-8"><Inbox className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No correspondence recorded yet</p></div>
          ) : (
            <div className="space-y-3">
              {correspondence.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.channel === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                      {item.channel === 'Letter' && <Mail className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-semibold">{item.subject}</span>
                    </div>
                    <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{item.correspondence_date}</span>
                    <Badge variant="outline">{item.channel}</Badge>
                    <Badge variant="outline">{item.direction}</Badge>
                  </div>
                  <p className="text-sm">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showLogCallDialog} onOpenChange={setShowLogCallDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Phone Call</DialogTitle>
            <DialogDescription>Record call details. This will be saved in the central correspondence system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Call Type</Label>
              <Select value={callForm.direction} onValueChange={v => setCallForm(f => ({ ...f, direction: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Outgoing">Outgoing</SelectItem><SelectItem value="Incoming">Incoming</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Contact Person</Label><Input value={callForm.contactPerson} onChange={e => setCallForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Name of person spoken to" /></div>
            <div className="space-y-2"><Label>Call Summary</Label><Textarea value={callForm.summary} onChange={e => setCallForm(f => ({ ...f, summary: e.target.value }))} placeholder="Summarize the conversation..." rows={4} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLogCallDialog(false)}>Cancel</Button>
              <Button onClick={() => logCallMutation.mutate()} disabled={logCallMutation.isPending}>
                {logCallMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Log Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendLetterDialog} onOpenChange={setShowSendLetterDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Letter / Email</DialogTitle>
            <DialogDescription>Generate and send correspondence to the employer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={letterForm.template} onValueChange={v => setLetterForm(f => ({ ...f, template: v }))}>
                <SelectTrigger><SelectValue placeholder="Select letter template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Registration Notice">Registration Notice</SelectItem>
                  <SelectItem value="Payment Reminder">Payment Reminder</SelectItem>
                  <SelectItem value="Compliance Warning">Compliance Warning</SelectItem>
                  <SelectItem value="Custom Letter">Custom Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <Select value={letterForm.deliveryMethod} onValueChange={v => setLetterForm(f => ({ ...f, deliveryMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">Physical Letter</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={letterForm.notes}
                onChange={e => setLetterForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSendLetterDialog(false)}>Cancel</Button>
              <Button
                onClick={() => sendLetterMutation.mutate()}
                disabled={sendLetterMutation.isPending || !letterForm.template}
              >
                {sendLetterMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Queue for Sending
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
