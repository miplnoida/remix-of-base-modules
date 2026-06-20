/**
 * Version history + lifecycle + diff + impact for a single legal reference.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  listVersionsForMaster,
  diffVersions,
  type LegalReferenceVersion,
} from '@/services/legal-reference/versionService';
import {
  createDraftVersion,
  transitionVersion,
  nextTransitions,
} from '@/services/legal-reference/versionLifecycleService';
import { impactForVersion, impactForMaster } from '@/services/legal-reference/impactAnalysisService';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  masterId: string;
  masterCode: string;
  userCode?: string;
}

const statusVariant = (s: string) =>
  s === 'PUBLISHED' ? 'default'
    : s === 'DRAFT' ? 'secondary'
    : s === 'SUPERSEDED' || s === 'ARCHIVED' ? 'outline'
    : 'secondary';

export const VersionHistoryDialog: React.FC<Props> = ({
  open, onOpenChange, masterId, masterCode, userCode,
}) => {
  const qc = useQueryClient();
  const { data: versions = [], refetch } = useQuery({
    queryKey: ['legal-ref-versions', masterId],
    queryFn: () => listVersionsForMaster(masterId),
    enabled: open && !!masterId,
  });

  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [effFrom, setEffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const aVer = versions.find((v) => v.id === compareA);
  const bVer = versions.find((v) => v.id === compareB);
  const diff = useMemo(
    () => (aVer && bVer ? diffVersions(aVer, bVer) : []),
    [aVer, bVer],
  );

  const { data: masterImpact } = useQuery({
    queryKey: ['legal-ref-master-impact', masterId],
    queryFn: () => impactForMaster(masterId),
    enabled: open && !!masterId,
  });

  const handleCreateDraft = async () => {
    try {
      await createDraftVersion({
        masterId,
        userCode: userCode || 'SYSTEM',
        effectiveFrom: effFrom,
        changeReason: reason || undefined,
      });
      toast.success('Draft version created');
      setReason('');
      await refetch();
      qc.invalidateQueries({ queryKey: ['legal-references'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleTransition = async (v: LegalReferenceVersion, to: string) => {
    try {
      await transitionVersion({
        versionId: v.id,
        toStatus: to as any,
        userCode: userCode || 'SYSTEM',
        reason,
      });
      toast.success(`Version → ${to}`);
      await refetch();
      qc.invalidateQueries({ queryKey: ['legal-references'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Version History — <span className="font-mono">{masterCode}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="new">New Version</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>v#</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Section / Regulation</TableHead>
                  <TableHead>Approved / Published</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono">v{v.version_number}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(v.version_status)} className="text-[10px]">
                        {v.version_status}
                      </Badge>
                      {v.version_status === 'PUBLISHED' && (
                        <Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {v.effective_from}{v.effective_to ? ` → ${v.effective_to}` : ''}
                    </TableCell>
                    <TableCell className="text-xs">
                      {[v.section && `§ ${v.section}`, v.regulation].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.approved_at ? `Approved ${v.approved_at.slice(0,10)} by ${v.approved_by ?? '—'}` : ''}
                      {v.published_at ? <div>Published {v.published_at.slice(0,10)} by {v.published_by ?? '—'}</div> : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {nextTransitions(v.version_status).map((to) => (
                          <Button
                            key={to}
                            size="sm"
                            variant={to === 'PUBLISHED' ? 'default' : 'outline'}
                            onClick={() => handleTransition(v, to)}
                          >
                            → {to}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!versions.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No versions</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-3 max-w-md">
            <p className="text-sm text-muted-foreground">
              Create a new DRAFT version cloned from the latest version. Edit it through
              the standard form, then submit / review / approve / publish below.
            </p>
            <div>
              <Label>Effective From *</Label>
              <Input type="date" value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
            </div>
            <div>
              <Label>Change Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Amendment Act 2026" />
            </div>
            <Button onClick={handleCreateDraft} disabled={!effFrom}>
              <Plus className="h-4 w-4 mr-1" />Create Draft Version
            </Button>
          </TabsContent>

          <TabsContent value="compare" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Version A</Label>
                <Select value={compareA} onValueChange={setCompareA}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>v{v.version_number} ({v.version_status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Version B</Label>
                <Select value={compareB} onValueChange={setCompareB}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>v{v.version_number} ({v.version_status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {aVer && bVer && (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Field</TableHead><TableHead>v{aVer.version_number}</TableHead><TableHead>v{bVer.version_number}</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {diff.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No differences</TableCell></TableRow>
                  ) : diff.map((d) => (
                    <TableRow key={d.field}>
                      <TableCell className="font-medium">{d.field}</TableCell>
                      <TableCell className="text-xs whitespace-pre-wrap">{String(d.before ?? '—')}</TableCell>
                      <TableCell className="text-xs whitespace-pre-wrap">{String(d.after ?? '—')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="impact" className="mt-4">
            {masterImpact ? (
              <div className="grid grid-cols-3 gap-3">
                <ImpactCard label="Templates" value={masterImpact.templates} />
                <ImpactCard label="Generated documents" value={masterImpact.generatedDocuments} />
                <ImpactCard label="Module mappings" value={masterImpact.moduleMappings} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Generated documents store their own immutable snapshot — superseding this
              reference will not modify historical letters.
            </p>
            <VersionImpactList versions={versions} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const ImpactCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="border rounded-md p-3">
    <div className="text-2xl font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

const VersionImpactList: React.FC<{ versions: LegalReferenceVersion[] }> = ({ versions }) => {
  return (
    <div className="mt-4 space-y-1">
      <div className="text-sm font-medium">Per-version usage</div>
      {versions.map((v) => <VersionImpactRow key={v.id} version={v} />)}
    </div>
  );
};

const VersionImpactRow: React.FC<{ version: LegalReferenceVersion }> = ({ version }) => {
  const { data } = useQuery({
    queryKey: ['legal-ref-version-impact', version.id],
    queryFn: () => impactForVersion(version.id),
  });
  return (
    <div className="flex items-center justify-between text-xs border rounded px-2 py-1">
      <span>v{version.version_number} ({version.version_status})</span>
      <span className="text-muted-foreground">
        {data ? `${data.generatedDocuments} docs · ${data.templates} templates · ${data.moduleMappings} mappings` : '…'}
      </span>
    </div>
  );
};

export default VersionHistoryDialog;
