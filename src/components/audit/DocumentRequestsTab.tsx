import React, { useState, useEffect } from 'react';
import { Plus, Loader2, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useDocumentRequests, useDocumentRequestMutations } from '@/hooks/useEngagementExecution';
import { useIADepartments } from '@/hooks/useAuditData';
import { formatDateForDisplay } from '@/lib/format-config';
import { Badge } from '@/components/ui/badge';

interface Props {
  engagementId: string;
  departmentId?: string;
}

export function DocumentRequestsTab({ engagementId, departmentId }: Props) {
  const { data: requests = [], isLoading } = useDocumentRequests(engagementId);
  const { data: departments = [] } = useIADepartments();
  const { create, update } = useDocumentRequestMutations();
  const [showForm, setShowForm] = useState(false);
  const [overrideRecipient, setOverrideRecipient] = useState(false);
  const [form, setForm] = useState({
    document_title: '', description: '', requested_from: '',
    requested_from_email: '', due_date: '', priority: 'Medium',
  });

  // Auto-populate department head when form opens
  const dept = departments?.find((d: any) => d.id === departmentId);
  const defaultHead = dept?.head || '';
  const defaultEmail = dept?.email || '';

  useEffect(() => {
    if (showForm && !overrideRecipient) {
      setForm(f => ({
        ...f,
        requested_from: defaultHead,
        requested_from_email: defaultEmail,
      }));
    }
  }, [showForm, defaultHead, defaultEmail, overrideRecipient]);

  const handleCreate = () => {
    if (!form.document_title) return;
    create.mutate({ ...form, engagement_id: engagementId }, {
      onSuccess: () => {
        setShowForm(false);
        setOverrideRecipient(false);
        setForm({ document_title: '', description: '', requested_from: '', requested_from_email: '', due_date: '', priority: 'Medium' });
      },
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    update.mutate({
      id, status,
      ...(status === 'Received' ? { received_date: new Date().toISOString().split('T')[0] } : {}),
    });
  };

  const isOverdue = (r: any) => r.due_date && r.status === 'Pending' && new Date(r.due_date) < new Date();

  const columns: DataTableColumn<any>[] = [
    { key: 'document_title', header: 'Document', render: (r) => <span className="font-medium text-sm">{r.document_title}</span> },
    { key: 'requested_from', header: 'Requested From', render: (r) => (
      <div>
        <span className="text-sm">{r.requested_from || '—'}</span>
        {r.requested_from_email && <span className="text-xs text-muted-foreground block">{r.requested_from_email}</span>}
      </div>
    )},
    { key: 'due_date', header: 'Due Date', render: (r) => (
      <span className={`text-sm ${isOverdue(r) ? 'text-destructive font-medium' : ''}`}>
        {r.due_date ? formatDateForDisplay(r.due_date) : '—'}
      </span>
    )},
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority || 'Medium'} /> },
    {
      key: 'status', header: 'Status', render: (r) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={r.status || 'Pending'} />
          {isOverdue(r) && <StatusBadge status="Overdue" />}
        </div>
      )
    },
    { key: 'received_date', header: 'Received', render: (r) => r.received_date ? formatDateForDisplay(r.received_date) : '—' },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const pendingCount = requests.filter((r: any) => r.status === 'Pending').length;
  const overdueCount = requests.filter(isOverdue).length;
  const receivedCount = requests.filter((r: any) => r.status === 'Received').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Requests</p><p className="text-xl font-bold">{requests.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-bold text-destructive">{overdueCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Received</p><p className="text-xl font-bold text-primary">{receivedCount}</p></CardContent></Card>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{requests.length} document request(s)</p>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setOverrideRecipient(false); }}><Plus className="h-4 w-4 mr-1" />New Request</Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Document Title *</Label><Input value={form.document_title} onChange={e => setForm(f => ({ ...f, document_title: e.target.value }))} placeholder="e.g. Bank Reconciliation Q3" /></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['High', 'Medium', 'Low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about the document needed..." rows={2} /></div>

            {/* Recipient Section - defaults to Department Head */}
            <div className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recipient (Department Head)</p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setOverrideRecipient(!overrideRecipient)}>
                  {overrideRecipient ? 'Reset to Default' : 'Override'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.requested_from}
                    onChange={e => setForm(f => ({ ...f, requested_from: e.target.value }))}
                    placeholder="Department Head Name"
                    disabled={!overrideRecipient}
                    className={!overrideRecipient ? 'bg-muted' : ''}
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={form.requested_from_email}
                    onChange={e => setForm(f => ({ ...f, requested_from_email: e.target.value }))}
                    placeholder="Email"
                    disabled={!overrideRecipient}
                    className={!overrideRecipient ? 'bg-muted' : ''}
                  />
                </div>
              </div>
              {!overrideRecipient && dept && (
                <p className="text-xs text-muted-foreground">
                  Auto-populated from department: <span className="font-medium">{dept.name}</span>
                </p>
              )}
              {!dept && departmentId && (
                <p className="text-xs text-amber-600">Department head information not found. Please override manually.</p>
              )}
            </div>

            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={create.isPending || !form.document_title}><FileText className="h-4 w-4 mr-1" />Create Request</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={requests}
            emptyMessage="No document requests yet. Click 'New Request' to request documents from the Department Head."
            rowClassName={(row) => isOverdue(row) ? 'bg-destructive/5 border-l-2 border-l-destructive' : ''}
            renderActions={(row) => (
              <div className="flex gap-1">
                {row.status === 'Pending' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(row.id, 'Received')}>
                      <CheckCircle className="w-3 h-3 mr-1" />Received
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleStatusChange(row.id, 'Partially Received')}>
                      Partial
                    </Button>
                  </>
                )}
                {row.status === 'Partially Received' && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(row.id, 'Received')}>
                    <CheckCircle className="w-3 h-3 mr-1" />Complete
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
