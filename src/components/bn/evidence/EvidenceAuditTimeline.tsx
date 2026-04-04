import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, CheckCircle2, XCircle, ShieldOff, HelpCircle, RefreshCw, Trash2, Clock } from 'lucide-react';
import { useBnEvidenceAudit } from '@/hooks/bn/useBnEvidence';
import { formatDateForDisplay } from '@/lib/format-config';
import { EvidenceStatusBadge } from './EvidenceStatusBadge';

interface Props {
  claimId: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  UPLOAD: <Upload className="h-4 w-4 text-primary" />,
  VERIFY: <CheckCircle2 className="h-4 w-4 text-primary" />,
  REJECT: <XCircle className="h-4 w-4 text-destructive" />,
  WAIVE: <ShieldOff className="h-4 w-4 text-accent-foreground" />,
  REQUEST_INFO: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
  EXPIRE: <Clock className="h-4 w-4 text-destructive" />,
  REPLACE: <RefreshCw className="h-4 w-4 text-primary" />,
  DELETE: <Trash2 className="h-4 w-4 text-destructive" />,
};

export function EvidenceAuditTimeline({ claimId }: Props) {
  const { data: auditEntries = [], isLoading } = useBnEvidenceAudit(claimId);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(auditEntries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-audit-${claimId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Evidence Audit Trail</CardTitle>
          <CardDescription>Chronological record of all evidence actions</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={auditEntries.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-4">Loading audit trail...</p>
        ) : auditEntries.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No evidence actions recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {auditEntries.map((entry: any) => (
              <div key={entry.id} className="flex gap-3 border-l-2 border-border pl-4 py-3 hover:bg-muted/30 rounded-r-lg transition-colors">
                <div className="mt-0.5">{ACTION_ICONS[entry.action] || <Clock className="h-4 w-4" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                    <span className="text-sm font-medium">{entry.bn_claim_evidence?.document_name || 'Document'}</span>
                    {entry.from_status && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <EvidenceStatusBadge status={entry.from_status} /> → <EvidenceStatusBadge status={entry.to_status} />
                      </span>
                    )}
                  </div>
                  {entry.reason && <p className="mt-1 text-sm text-muted-foreground">{entry.reason}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {entry.performed_by} • {formatDateForDisplay(entry.performed_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
