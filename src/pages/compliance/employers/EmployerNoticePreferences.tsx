import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Mail, Phone, MapPin, User, Shield, FileText, Clock, Save, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  useEmployerContactView,
  useEmployerContactPreferences,
  useUpsertContactPreferences,
  useNoticeRecipients,
  useCreateNoticeRecipient,
  useUpdateNoticeRecipient,
  useServiceLog,
  useCreateServiceLogEntry,
} from '@/hooks/compliance/useEmployerNoticePreferences';

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'print', label: 'Print / Mail' },
  { value: 'officer_delivery', label: 'Officer Delivery' },
  { value: 'registered_mail', label: 'Registered Mail' },
  { value: 'courier', label: 'Courier' },
];

const DELIVERY_STATUSES = ['pending', 'dispatched', 'delivered', 'failed', 'returned', 'acknowledged'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': case 'acknowledged': return 'bg-green-500/10 text-green-700 border-green-200';
    case 'dispatched': return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    case 'failed': case 'returned': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return '';
  }
};

export default function EmployerNoticePreferences() {
  const [employerId, setEmployerId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState('contact');
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);

  const { data: contactView } = useEmployerContactView(employerId || undefined);
  const { data: prefs } = useEmployerContactPreferences(employerId || undefined);
  const { data: recipients } = useNoticeRecipients(employerId || undefined);
  const { data: serviceLog } = useServiceLog(employerId || undefined);

  const upsertPrefs = useUpsertContactPreferences();
  const createRecipient = useCreateNoticeRecipient();
  const updateRecipient = useUpdateNoticeRecipient();
  const createServiceEntry = useCreateServiceLogEntry();

  const contact = contactView?.[0] as any;

  // Preferences form state
  const [prefsForm, setPrefsForm] = useState<Record<string, any>>({});
  const prefsLoaded = prefs !== undefined;

  const initPrefsForm = () => {
    setPrefsForm({
      employer_id: employerId,
      preferred_channel: prefs?.preferred_channel || 'email',
      notice_email: (prefs as any)?.notice_email || '',
      notice_phone: (prefs as any)?.notice_phone || '',
      notice_fax: (prefs as any)?.notice_fax || '',
      notice_address_line1: (prefs as any)?.notice_address_line1 || '',
      notice_address_line2: (prefs as any)?.notice_address_line2 || '',
      physical_delivery_address_1: (prefs as any)?.physical_delivery_address_1 || '',
      physical_delivery_address_2: (prefs as any)?.physical_delivery_address_2 || '',
      physical_delivery_parish: (prefs as any)?.physical_delivery_parish || '',
      authorized_contact_name: (prefs as any)?.authorized_contact_name || '',
      authorized_contact_title: (prefs as any)?.authorized_contact_title || '',
      authorized_contact_phone: (prefs as any)?.authorized_contact_phone || '',
      authorized_contact_email: (prefs as any)?.authorized_contact_email || '',
      legal_representative_name: (prefs as any)?.legal_representative_name || '',
      legal_representative_firm: (prefs as any)?.legal_representative_firm || '',
      legal_representative_phone: (prefs as any)?.legal_representative_phone || '',
      legal_representative_email: (prefs as any)?.legal_representative_email || '',
      consent_given: (prefs as any)?.consent_given || false,
      opt_out_physical: (prefs as any)?.opt_out_physical || false,
      opt_out_email: (prefs as any)?.opt_out_email || false,
      notes: (prefs as any)?.notes || '',
    });
  };

  // Recipient form
  const [recipientForm, setRecipientForm] = useState({
    notice_type: '',
    notice_reference: '',
    recipient_name: '',
    recipient_role: '',
    channel: 'email',
    delivery_email: '',
    delivery_address: '',
    notes: '',
  });

  // Service log form
  const [serviceForm, setServiceForm] = useState({
    service_type: 'notice_delivery',
    service_action: '',
    channel: 'email',
    recipient_name: '',
    recipient_address: '',
    reference_number: '',
    officer_name: '',
    notes: '',
  });

  const handleSearch = () => {
    if (searchInput.trim()) {
      setEmployerId(searchInput.trim());
      setTimeout(initPrefsForm, 500);
    }
  };

  const handleSavePrefs = () => {
    upsertPrefs.mutate({ ...prefsForm, employer_id: employerId, is_active: true });
  };

  const handleCreateRecipient = () => {
    createRecipient.mutate({
      employer_id: employerId,
      ...recipientForm,
    }, {
      onSuccess: () => {
        setShowRecipientDialog(false);
        setRecipientForm({ notice_type: '', notice_reference: '', recipient_name: '', recipient_role: '', channel: 'email', delivery_email: '', delivery_address: '', notes: '' });
      },
    });
  };

  const handleCreateServiceEntry = () => {
    createServiceEntry.mutate({
      employer_id: employerId,
      ...serviceForm,
      outcome: 'pending',
    }, {
      onSuccess: () => {
        setShowServiceDialog(false);
        setServiceForm({ service_type: 'notice_delivery', service_action: '', channel: 'email', recipient_name: '', recipient_address: '', reference_number: '', officer_name: '', notes: '' });
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notice & Contact Preferences</h1>
        <p className="text-muted-foreground">Manage compliance contact preferences, notice recipients, and service history</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter employer registration number..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Load Employer</Button>
          </div>
        </CardContent>
      </Card>

      {!employerId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Enter an employer registration number to begin</CardContent></Card>
      ) : (
        <>
          {/* Employer identity header */}
          {contact && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{contact.employer_name || employerId}</h2>
                    <p className="text-sm text-muted-foreground">Registration: {contact.employer_id}</p>
                    <Badge variant="outline" className="mt-1">{contact.employer_status || 'Unknown'}</Badge>
                  </div>
                  <div className="text-right text-sm space-y-1">
                    <div className="flex items-center gap-2 justify-end">
                      <Mail className="h-3 w-3" />
                      <span>Effective: {contact.effective_email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Phone className="h-3 w-3" />
                      <span>Effective: {contact.effective_phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Badge variant="secondary">{contact.effective_channel}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="contact" className="gap-2"><User className="h-4 w-4" /> Contact & Preferences</TabsTrigger>
              <TabsTrigger value="recipients" className="gap-2"><FileText className="h-4 w-4" /> Notice Recipients</TabsTrigger>
              <TabsTrigger value="service-log" className="gap-2"><Clock className="h-4 w-4" /> Service History</TabsTrigger>
            </TabsList>

            {/* Contact & Preferences Tab */}
            <TabsContent value="contact" className="space-y-4">
              {/* Source contact (read-only) */}
              {contact && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Source Contact <Badge variant="secondary" className="text-xs">Read-Only</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div><Label className="text-muted-foreground">Phone</Label><p>{contact.master_phone || '—'}</p></div>
                      <div><Label className="text-muted-foreground">Mobile</Label><p>{contact.master_mobile || '—'}</p></div>
                      <div><Label className="text-muted-foreground">Fax</Label><p>{contact.master_fax || '—'}</p></div>
                      <div><Label className="text-muted-foreground">Email</Label><p>{contact.master_email || '—'}</p></div>
                      <div><Label className="text-muted-foreground">Mail Address 1</Label><p>{contact.master_mail_address_1 || '—'}</p></div>
                      <div><Label className="text-muted-foreground">Mail Address 2</Label><p>{contact.master_mail_address_2 || '—'}</p></div>
                      <div><Label className="text-muted-foreground">HQ Address 1</Label><p>{contact.master_hq_address_1 || '—'}</p></div>
                      <div><Label className="text-muted-foreground">HQ Address 2</Label><p>{contact.master_hq_address_2 || '—'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compliance preferences (editable) */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Compliance Contact Preferences
                  </CardTitle>
                  <Button size="sm" onClick={initPrefsForm} variant="outline">Reset Form</Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Channel preference */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Preferred Notice Channel</Label>
                      <Select value={prefsForm.preferred_channel || 'email'} onValueChange={v => setPrefsForm(p => ({ ...p, preferred_channel: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Compliance Email</Label>
                      <Input value={prefsForm.notice_email || ''} onChange={e => setPrefsForm(p => ({ ...p, notice_email: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Compliance Phone</Label>
                      <Input value={prefsForm.notice_phone || ''} onChange={e => setPrefsForm(p => ({ ...p, notice_phone: e.target.value }))} />
                    </div>
                  </div>

                  {/* Physical delivery */}
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3"><MapPin className="h-4 w-4" /> Physical Delivery Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><Label>Address Line 1</Label><Input value={prefsForm.physical_delivery_address_1 || ''} onChange={e => setPrefsForm(p => ({ ...p, physical_delivery_address_1: e.target.value }))} /></div>
                      <div><Label>Address Line 2</Label><Input value={prefsForm.physical_delivery_address_2 || ''} onChange={e => setPrefsForm(p => ({ ...p, physical_delivery_address_2: e.target.value }))} /></div>
                      <div><Label>Parish</Label><Input value={prefsForm.physical_delivery_parish || ''} onChange={e => setPrefsForm(p => ({ ...p, physical_delivery_parish: e.target.value }))} /></div>
                    </div>
                  </div>

                  {/* Authorized contact */}
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3"><User className="h-4 w-4" /> Authorized Compliance Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><Label>Name</Label><Input value={prefsForm.authorized_contact_name || ''} onChange={e => setPrefsForm(p => ({ ...p, authorized_contact_name: e.target.value }))} /></div>
                      <div><Label>Title</Label><Input value={prefsForm.authorized_contact_title || ''} onChange={e => setPrefsForm(p => ({ ...p, authorized_contact_title: e.target.value }))} /></div>
                      <div><Label>Phone</Label><Input value={prefsForm.authorized_contact_phone || ''} onChange={e => setPrefsForm(p => ({ ...p, authorized_contact_phone: e.target.value }))} /></div>
                      <div><Label>Email</Label><Input value={prefsForm.authorized_contact_email || ''} onChange={e => setPrefsForm(p => ({ ...p, authorized_contact_email: e.target.value }))} /></div>
                    </div>
                  </div>

                  {/* Legal representative */}
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3"><Shield className="h-4 w-4" /> Legal Representative</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><Label>Name</Label><Input value={prefsForm.legal_representative_name || ''} onChange={e => setPrefsForm(p => ({ ...p, legal_representative_name: e.target.value }))} /></div>
                      <div><Label>Firm</Label><Input value={prefsForm.legal_representative_firm || ''} onChange={e => setPrefsForm(p => ({ ...p, legal_representative_firm: e.target.value }))} /></div>
                      <div><Label>Phone</Label><Input value={prefsForm.legal_representative_phone || ''} onChange={e => setPrefsForm(p => ({ ...p, legal_representative_phone: e.target.value }))} /></div>
                      <div><Label>Email</Label><Input value={prefsForm.legal_representative_email || ''} onChange={e => setPrefsForm(p => ({ ...p, legal_representative_email: e.target.value }))} /></div>
                    </div>
                  </div>

                  {/* Consent & opt-outs */}
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={prefsForm.consent_given || false} onCheckedChange={v => setPrefsForm(p => ({ ...p, consent_given: v }))} />
                      <Label>Consent Given</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={prefsForm.opt_out_email || false} onCheckedChange={v => setPrefsForm(p => ({ ...p, opt_out_email: v }))} />
                      <Label>Opt-Out Email</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={prefsForm.opt_out_physical || false} onCheckedChange={v => setPrefsForm(p => ({ ...p, opt_out_physical: v }))} />
                      <Label>Opt-Out Physical Mail</Label>
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea value={prefsForm.notes || ''} onChange={e => setPrefsForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>

                  <Button onClick={handleSavePrefs} disabled={upsertPrefs.isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {upsertPrefs.isPending ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notice Recipients Tab */}
            <TabsContent value="recipients" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowRecipientDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Recipient
                </Button>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Notice Recipients</CardTitle></CardHeader>
                <CardContent>
                  {(recipients || []).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No notice recipients found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Notice Type</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Delivery</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Dispatched</TableHead>
                          <TableHead>Acknowledged</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(recipients || []).map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{r.recipient_name}</span>
                                {r.recipient_role && <div className="text-xs text-muted-foreground">{r.recipient_role}</div>}
                              </div>
                            </TableCell>
                            <TableCell>{r.notice_type}</TableCell>
                            <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                            <TableCell className="text-sm">{r.delivery_email || r.delivery_address || '—'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(r.delivery_status)}>{r.delivery_status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{r.dispatched_at ? format(new Date(r.dispatched_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                            <TableCell className="text-sm">{r.acknowledged_at ? format(new Date(r.acknowledged_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Service Log Tab */}
            <TabsContent value="service-log" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowServiceDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Log Service Action
                </Button>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Service History</CardTitle></CardHeader>
                <CardContent>
                  {(serviceLog || []).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No service history found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Officer</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(serviceLog || []).map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm">{format(new Date(s.attempted_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell>{s.service_type}</TableCell>
                            <TableCell>{s.service_action}</TableCell>
                            <TableCell><Badge variant="outline">{s.channel || '—'}</Badge></TableCell>
                            <TableCell>{s.recipient_name || '—'}</TableCell>
                            <TableCell>{s.officer_name || '—'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(s.outcome)}>{s.outcome}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{s.reference_number || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Add Recipient Dialog */}
      <Dialog open={showRecipientDialog} onOpenChange={setShowRecipientDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Notice Recipient</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Notice Type</Label><Input value={recipientForm.notice_type} onChange={e => setRecipientForm(p => ({ ...p, notice_type: e.target.value }))} placeholder="e.g. Arrears Notice" /></div>
              <div><Label>Reference</Label><Input value={recipientForm.notice_reference} onChange={e => setRecipientForm(p => ({ ...p, notice_reference: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Recipient Name</Label><Input value={recipientForm.recipient_name} onChange={e => setRecipientForm(p => ({ ...p, recipient_name: e.target.value }))} /></div>
              <div><Label>Role</Label><Input value={recipientForm.recipient_role} onChange={e => setRecipientForm(p => ({ ...p, recipient_role: e.target.value }))} placeholder="e.g. Director, Agent" /></div>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={recipientForm.channel} onValueChange={v => setRecipientForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Delivery Email</Label><Input value={recipientForm.delivery_email} onChange={e => setRecipientForm(p => ({ ...p, delivery_email: e.target.value }))} /></div>
              <div><Label>Delivery Address</Label><Input value={recipientForm.delivery_address} onChange={e => setRecipientForm(p => ({ ...p, delivery_address: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={recipientForm.notes} onChange={e => setRecipientForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipientDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRecipient} disabled={createRecipient.isPending || !recipientForm.recipient_name || !recipientForm.notice_type}>
              {createRecipient.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Service Action Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Service Action</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Service Type</Label><Input value={serviceForm.service_type} onChange={e => setServiceForm(p => ({ ...p, service_type: e.target.value }))} /></div>
              <div><Label>Action</Label><Input value={serviceForm.service_action} onChange={e => setServiceForm(p => ({ ...p, service_action: e.target.value }))} placeholder="e.g. Notice Sent" /></div>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={serviceForm.channel} onValueChange={v => setServiceForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Recipient Name</Label><Input value={serviceForm.recipient_name} onChange={e => setServiceForm(p => ({ ...p, recipient_name: e.target.value }))} /></div>
              <div><Label>Address/Email</Label><Input value={serviceForm.recipient_address} onChange={e => setServiceForm(p => ({ ...p, recipient_address: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Reference Number</Label><Input value={serviceForm.reference_number} onChange={e => setServiceForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
              <div><Label>Officer Name</Label><Input value={serviceForm.officer_name} onChange={e => setServiceForm(p => ({ ...p, officer_name: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={serviceForm.notes} onChange={e => setServiceForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateServiceEntry} disabled={createServiceEntry.isPending || !serviceForm.service_action}>
              {createServiceEntry.isPending ? 'Logging...' : 'Log Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
