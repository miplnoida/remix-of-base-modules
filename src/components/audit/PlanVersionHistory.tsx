import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Eye, ArrowRight, Loader2, FileText } from 'lucide-react';
import { usePlanVersions } from '@/hooks/useAuditWorkflowGates';
import { formatDateForDisplay } from '@/lib/format-config';

interface PlanVersionHistoryProps {
  planId: string;
}

interface VersionDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

function computeDiff(currentSnapshot: Record<string, any>, previousSnapshot: Record<string, any>): VersionDiff[] {
  const diffs: VersionDiff[] = [];
  const allKeys = new Set([...Object.keys(currentSnapshot || {}), ...Object.keys(previousSnapshot || {})]);
  const skipKeys = new Set(['id', 'created_at', 'updated_at', 'version_number', 'plan_id']);
  
  allKeys.forEach(key => {
    if (skipKeys.has(key)) return;
    const oldVal = previousSnapshot?.[key];
    const newVal = currentSnapshot?.[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({
        field: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        oldValue: oldVal ?? '—',
        newValue: newVal ?? '—',
      });
    }
  });
  return diffs;
}

export function PlanVersionHistory({ planId }: PlanVersionHistoryProps) {
  const { data: versions = [], isLoading } = usePlanVersions(planId);
  const [diffDialogVersion, setDiffDialogVersion] = useState<any>(null);
  const [diffData, setDiffData] = useState<VersionDiff[]>([]);

  const handleViewDiff = (version: any, idx: number) => {
    const currentSnapshot = version.snapshot_data || {};
    const previousVersion = versions[idx + 1]; // versions ordered desc
    const previousSnapshot = previousVersion?.snapshot_data || {};
    const diffs = computeDiff(currentSnapshot, previousSnapshot);
    setDiffData(diffs);
    setDiffDialogVersion(version);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading version history...</span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mb-2" />
        <p className="text-sm">No version history for this plan.</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Plan Version History ({versions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {versions.map((version: any, idx: number) => (
            <div
              key={version.id || version.version_number}
              className="flex items-center justify-between rounded-md border px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant={idx === 0 ? 'default' : 'secondary'} className="shrink-0 text-xs">
                  v{version.version_number}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {version.change_summary || (idx === versions.length - 1 ? 'Initial version' : 'Plan updated')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {version.submitted_by || 'System'} · {version.created_at ? formatDateForDisplay(version.created_at) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {version.status_at_snapshot || 'Snapshot'}
                </Badge>
                {idx < versions.length - 1 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleViewDiff(version, idx)}>
                    <Eye className="h-3 w-3 mr-1" />
                    Diff
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!diffDialogVersion} onOpenChange={() => setDiffDialogVersion(null)}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Version {diffDialogVersion?.version_number} Changes
            </DialogTitle>
          </DialogHeader>
          {diffData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No field changes detected between versions.</p>
          ) : (
            <div className="space-y-2">
              {diffData.map((diff, idx) => (
                <div key={idx} className="rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{diff.field}</p>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 rounded bg-destructive/5 border border-destructive/20 px-2 py-1">
                      <p className="text-xs text-destructive line-through break-words">
                        {typeof diff.oldValue === 'object' ? JSON.stringify(diff.oldValue) : String(diff.oldValue)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 rounded bg-green-50 border border-green-200 px-2 py-1">
                      <p className="text-xs text-green-800 break-words">
                        {typeof diff.newValue === 'object' ? JSON.stringify(diff.newValue) : String(diff.newValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
