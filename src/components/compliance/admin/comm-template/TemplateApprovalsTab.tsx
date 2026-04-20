import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { AuditCommunicationTemplate, CeCommApprovalRole } from '@/types/auditCommunication';

const ROLE_LABELS: Record<CeCommApprovalRole, string> = {
  inspector: 'Inspector',
  lead_inspector: 'Lead Inspector',
  supervisor: 'Supervisor',
  legal: 'Legal',
};

const ALL_ROLES: CeCommApprovalRole[] = ['inspector', 'lead_inspector', 'supervisor', 'legal'];

interface Props {
  draft: Partial<AuditCommunicationTemplate>;
  onChange: (patch: Partial<AuditCommunicationTemplate>) => void;
}

export default function TemplateApprovalsTab({ draft, onChange }: Props) {
  const rule = draft.approval_rule_json || { roles: [] };
  const roles = rule.roles || [];

  const toggle = (r: CeCommApprovalRole, on: boolean) => {
    const next = on ? [...roles, r] : roles.filter(x => x !== r);
    onChange({ approval_rule_json: { ...rule, roles: next } });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={!!draft.requires_approval_before_send}
            onCheckedChange={(v) => onChange({ requires_approval_before_send: v })}
          />
          <Label>Require approval before send</Label>
        </div>
        <div>
          <Label>Approver roles (in order)</Label>
          <p className="text-xs text-muted-foreground mb-2">All listed roles must approve. If empty, no approval is required.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_ROLES.map(r => (
              <label key={r} className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                <Checkbox checked={roles.includes(r)} onCheckedChange={(v) => toggle(r, !!v)} />
                <span>{ROLE_LABELS[r]}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
