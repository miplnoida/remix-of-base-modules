import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ClipboardCheck, CheckCircle, XCircle, MinusCircle, Trash2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuditChecklists } from '@/hooks/useAuditChecklists';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { CommunicationTimeline } from '@/components/audit/CommunicationTimeline';
import { NotificationLogViewer } from '@/components/audit/NotificationLogViewer';
import { DocumentRequestsTab } from '@/components/audit/DocumentRequestsTab';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface AuditPreparationTabProps {
  auditId: string;
  audit: any;
  engagementContext?: any;
}

export function AuditPreparationTab({ auditId, audit, engagementContext }: AuditPreparationTabProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    checklist: true,
    communications: false,
    documents: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      {/* Checklist Section */}
      <Collapsible open={openSections.checklist} onOpenChange={() => toggleSection('checklist')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />Audit Checklist
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.checklist ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ChecklistSection auditId={auditId} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Communications Section */}
      <Collapsible open={openSections.communications} onOpenChange={() => toggleSection('communications')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />Communications & Notifications
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.communications ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <CommunicationTimeline engagementId={auditId} engagementName={audit?.engagement_name} engagementContext={engagementContext} />
              <NotificationLogViewer engagementId={auditId} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Document Requests Section */}
      <Collapsible open={openSections.documents} onOpenChange={() => toggleSection('documents')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />Document Requests (PBC)
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.documents ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <DocumentRequestsTab engagementId={auditId} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function ChecklistSection({ auditId }: { auditId: string }) {
  const { data: items = [], isLoading, create, update, archive } = useAuditChecklists(auditId);
  const [newQuestion, setNewQuestion] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAdd = () => {
    if (!newQuestion.trim()) return;
    create.mutate({ question: newQuestion.trim(), description: newDescription.trim() || null, response: 'Not Assessed', status: 'Pending', sort_order: items.length }, {
      onSuccess: () => { setNewQuestion(''); setNewDescription(''); },
    });
  };

  const handleResponse = (id: string, response: string) => {
    update.mutate({ id, response, status: response === 'Not Assessed' ? 'Pending' : 'Completed' });
  };

  const responseIcon = (response: string) => {
    if (response === 'Compliant') return <CheckCircle className="h-4 w-4 text-primary" />;
    if (response === 'Non-Compliant') return <XCircle className="h-4 w-4 text-destructive" />;
    if (response === 'Not Applicable') return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    return <ClipboardCheck className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const totalAssessed = items.filter((i: any) => i.response !== 'Not Assessed').length;
  const progress = items.length > 0 ? Math.round((totalAssessed / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-2 flex-1" />
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{progress}% assessed</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={items.length} />
        <StatCard label="Compliant" value={items.filter((i: any) => i.response === 'Compliant').length} color="text-primary" />
        <StatCard label="Non-Compliant" value={items.filter((i: any) => i.response === 'Non-Compliant').length} color="text-destructive" />
        <StatCard label="Pending" value={items.filter((i: any) => i.response === 'Not Assessed').length} />
      </div>

      {/* Add Question - compact */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">New Question</Label>
          <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Enter checklist question..." className="h-9" />
        </div>
        <Button onClick={handleAdd} disabled={!newQuestion.trim() || create.isPending} size="sm" className="h-9">
          <Plus className="h-3.5 w-3.5 mr-1" />Add
        </Button>
      </div>

      {items.length === 0 ? (
        <AuditEmptyState icon={ClipboardCheck} title="No checklist items" description="Add questions to evaluate audit readiness" />
      ) : (
        <div className="space-y-1.5">
          {items.map((item: any, idx: number) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="shrink-0">{responseIcon(item.response)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{idx + 1}. {item.question}</p>
                {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
              </div>
              <Select value={item.response || 'Not Assessed'} onValueChange={(v) => handleResponse(item.id, v)}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Assessed">Not Assessed</SelectItem>
                  <SelectItem value="Compliant">Compliant</SelectItem>
                  <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                  <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => archive.mutate(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-3 rounded-lg border border-border/50 bg-background">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
    </div>
  );
}
