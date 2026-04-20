import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useOnlineResponsePolicies,
  useTogglePolicyActive,
  useDeletePolicy,
} from '@/hooks/useOnlineResponse';
import { ONLINE_RESPONSE_MODE_LABELS, type OnlineResponsePolicy } from '@/types/onlineResponse';
import { PolicyEditorDialog } from './PolicyEditorDialog';

const MODE_BADGE: Record<string, string> = {
  NONE: 'bg-muted text-muted-foreground',
  VIEW_ONLY: 'bg-slate-100 text-slate-700 border-slate-300',
  ACKNOWLEDGMENT_ONLY: 'bg-blue-50 text-blue-700 border-blue-300',
  LIMITED_RESPONSE: 'bg-amber-50 text-amber-800 border-amber-300',
  FULL_RESPONSE: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

export function OnlineResponsePolicyMatrixTab() {
  const { data: policies = [], isLoading } = useOnlineResponsePolicies();
  const toggle = useTogglePolicyActive();
  const del = useDeletePolicy();
  const [editing, setEditing] = useState<OnlineResponsePolicy | null>(null);
  const [creating, setCreating] = useState(false);

  const remove = async (p: OnlineResponsePolicy) => {
    if (!confirm(`Delete policy "${p.policy_name}"? This cannot be undone.`)) return;
    try {
      await del.mutateAsync(p.id);
      toast.success('Policy deleted');
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base">Response Policy Matrix</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Resolution order: instance overrides → matched policy (highest priority) → template
            defaults → global setting.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Policy
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No policies configured. Without policies, behavior falls back to template defaults and
            the global setting.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead className="w-20">Active</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => {
                  const flags = [
                    p.allow_acknowledgment && 'Ack',
                    p.allow_document_upload && 'Upload',
                    p.allow_clarification && 'Clarify',
                    p.allow_narrative_response && 'Narrative',
                    p.allow_dispute && 'Dispute',
                    p.allow_corrective_action_response && 'Corrective',
                    p.allow_payment_response && 'Payment',
                  ].filter(Boolean) as string[];
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.policy_name}</div>
                        {p.description && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {p.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.case_type && <Badge variant="outline" className="text-[10px]">case: {p.case_type}</Badge>}
                          {p.communication_type && <Badge variant="outline" className="text-[10px]">comm: {p.communication_type}</Badge>}
                          {p.report_type && <Badge variant="outline" className="text-[10px]">report: {p.report_type}</Badge>}
                          {p.enforcement_stage && <Badge variant="outline" className="text-[10px]">stage: {p.enforcement_stage}</Badge>}
                          {!p.case_type && !p.communication_type && !p.report_type && !p.enforcement_stage && (
                            <span className="text-[11px] text-muted-foreground italic">All (wildcard)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${MODE_BADGE[p.response_mode] || ''}`} variant="outline">
                          {ONLINE_RESPONSE_MODE_LABELS[p.response_mode]}
                        </Badge>
                        {!p.portal_enabled && (
                          <div className="text-[10px] text-destructive mt-1">portal off</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {flags.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          ) : (
                            flags.map((f) => (
                              <Badge key={f} variant="secondary" className="text-[10px]">
                                {f}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.priority}</TableCell>
                      <TableCell>
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={(v) =>
                            toggle.mutate({ id: p.id, isActive: v })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {(editing || creating) && (
        <PolicyEditorDialog
          open={!!editing || creating}
          onOpenChange={(v) => {
            if (!v) {
              setEditing(null);
              setCreating(false);
            }
          }}
          policy={editing}
        />
      )}
    </Card>
  );
}
