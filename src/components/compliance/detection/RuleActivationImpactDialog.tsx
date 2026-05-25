import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export interface RuleImpactInfo {
  ruleType: 'Detection' | 'Calculation' | 'Escalation';
  name: string;
  ruleCode: string;
  triggerOrAction: string;
  dataSource: string;
  duplicateWindow?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  willAutoCreateViolations: boolean;
  approvalGateActive: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  info: RuleImpactInfo | null;
  validationErrors: string[];
  onConfirm: () => void;
  confirming?: boolean;
}

/**
 * Shown before flipping `is_enabled` on. Surfaces the real-world
 * impact (auto-creation, scope, data source, duplicate window) and
 * blocks confirmation when validation errors exist.
 */
export default function RuleActivationImpactDialog({
  open,
  onOpenChange,
  info,
  validationErrors,
  onConfirm,
  confirming,
}: Props) {
  if (!info) return null;

  const blocked = validationErrors.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Activate {info.ruleType} Rule?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                <span className="font-mono text-xs">{info.ruleCode}</span> —{' '}
                <span className="font-medium text-foreground">{info.name}</span>
              </p>

              {blocked && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Activation blocked</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
                      {validationErrors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1.5">
                <Row label="Rule type" value={info.ruleType} />
                <Row label="Trigger / action" value={info.triggerOrAction} />
                <Row label="Data source" value={info.dataSource} />
                {info.duplicateWindow && (
                  <Row label="Duplicate window" value={info.duplicateWindow} />
                )}
                {(info.effectiveFrom || info.effectiveTo) && (
                  <Row
                    label="Effective period"
                    value={`${info.effectiveFrom ?? '—'} → ${info.effectiveTo ?? 'open'}`}
                  />
                )}
                <Row
                  label="Auto-create violations"
                  value={
                    <Badge
                      variant={info.willAutoCreateViolations ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {info.willAutoCreateViolations ? 'Yes' : 'No'}
                    </Badge>
                  }
                />
              </div>

              {info.approvalGateActive && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Approval gate is enabled</AlertTitle>
                  <AlertDescription className="text-xs">
                    Confirming will submit a change request for approval rather
                    than activating immediately.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked || confirming}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {info.approvalGateActive ? 'Submit For Approval' : 'Activate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm text-foreground flex-1 break-words">{value}</span>
    </div>
  );
}
