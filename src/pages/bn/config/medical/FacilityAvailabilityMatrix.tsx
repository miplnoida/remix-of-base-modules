import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Building2, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useMedicalFacilities, useUpsertFacility, useDeleteFacility,
  useFacilityProcedures, useUpsertFacilityProcedure, useDeleteFacilityProcedure,
  useMedicalProcedures,
} from '@/hooks/bn/useBnMedical';
import type { BnMedicalFacility, BnMedicalFacilityProcedure } from '@/types/bnMedical';
import { useUserCode } from '@/hooks/useUserCode';

const LEVELS = ['LOCAL', 'REGIONAL', 'INTERNATIONAL'] as const;
const STATUSES = ['AVAILABLE', 'LIMITED', 'NOT_AVAILABLE'] as const;

export default function FacilityAvailabilityMatrix() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data: facilities = [] } = useMedicalFacilities();
  const { data: procedures = [] } = useMedicalProcedures();
  const { data: matrix = [] } = useFacilityProcedures();
  const upsertFac = useUpsertFacility();
  const delFac = useDeleteFacility();
  const upsertFP = useUpsertFacilityProcedure();
  const delFP = useDeleteFacilityProcedure();

  const [facOpen, setFacOpen] = useState(false);
  const [fac, setFac] = useState<Partial<BnMedicalFacility>>({});

  const [fpOpen, setFpOpen] = useState(false);
  const [fp, setFp] = useState<Partial<BnMedicalFacilityProcedure>>({});

  const procName = useMemo(() => new Map(procedures.map((p: any) => [p.id, `${p.procedure_code} — ${p.procedure_name}`])), [procedures]);
  const facName = useMemo(() => new Map(facilities.map((f: any) => [f.id, `${f.facility_code} — ${f.facility_name} (${f.jurisdiction_level})`])), [facilities]);

  const newFacility = () => {
    setFac({ facility_code: '', facility_name: '', country_code: 'SKN', jurisdiction_level: 'LOCAL', is_approved: true, is_active: true, effective_from: new Date().toISOString().slice(0, 10) });
    setFacOpen(true);
  };
  const newFP = () => {
    setFp({ availability_status: 'AVAILABLE', effective_from: new Date().toISOString().slice(0, 10) });
    setFpOpen(true);
  };

  const saveFac = async () => {
    if (!fac.facility_code || !fac.facility_name || !fac.country_code || !fac.jurisdiction_level) {
      toast({ title: 'Validation', description: 'Code, name, country and jurisdiction are required.', variant: 'destructive' }); return;
    }
    try { await upsertFac.mutateAsync({ ...fac, modified_by: userCode, ...(fac.id ? {} : { created_by: userCode }) } as any); toast({ title: 'Saved' }); setFacOpen(false); }
    catch (e: any) { toast({ title: 'Error', description: e?.message, variant: 'destructive' }); }
  };
  const saveFP = async () => {
    if (!fp.facility_id || !fp.procedure_id || !fp.availability_status) {
      toast({ title: 'Validation', description: 'Facility, procedure and status are required.', variant: 'destructive' }); return;
    }
    try { await upsertFP.mutateAsync({ ...fp, modified_by: userCode, ...(fp.id ? {} : { created_by: userCode }) } as any); toast({ title: 'Saved' }); setFpOpen(false); }
    catch (e: any) { toast({ title: 'Error', description: e?.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Facility Availability Matrix</h1>
          <p className="t-page-subtitle mt-1">Approved providers and which procedures they offer per jurisdiction.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Facilities</CardTitle><CardDescription>Local, regional and international approved providers.</CardDescription></div>
          <Button onClick={newFacility} className="gap-2"><Plus className="h-4 w-4" /> Add Facility</Button>
        </CardHeader>
        <CardContent>
          {facilities.length === 0 ? <p className="text-muted-foreground py-6 text-center">No facilities configured.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Jurisdiction</TableHead><TableHead>Approved</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {facilities.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm">{f.facility_code}</TableCell>
                    <TableCell>{f.facility_name}</TableCell>
                    <TableCell>{f.country_code}</TableCell>
                    <TableCell><Badge variant="outline">{f.jurisdiction_level}</Badge></TableCell>
                    <TableCell>{f.is_approved ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>{f.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setFac({ ...f }); setFacOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await delFac.mutateAsync(f.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Availability Matrix</CardTitle><CardDescription>Map procedures to facilities to drive the local → regional → international decision.</CardDescription></div>
          <Button onClick={newFP} className="gap-2" disabled={!facilities.length || !procedures.length}><Plus className="h-4 w-4" /> Add Mapping</Button>
        </CardHeader>
        <CardContent>
          {matrix.length === 0 ? <p className="text-muted-foreground py-6 text-center">No availability records yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Facility</TableHead><TableHead>Procedure</TableHead><TableHead>Status</TableHead><TableHead>Effective</TableHead><TableHead>Notes</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {matrix.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{facName.get(m.facility_id) || m.facility_id}</TableCell>
                    <TableCell className="text-sm">{procName.get(m.procedure_id) || m.procedure_id}</TableCell>
                    <TableCell><Badge variant={m.availability_status === 'NOT_AVAILABLE' ? 'destructive' : m.availability_status === 'LIMITED' ? 'warning' : 'default'}>{m.availability_status}</Badge></TableCell>
                    <TableCell className="text-xs">{m.effective_from}{m.effective_to ? ` → ${m.effective_to}` : ''}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.notes}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setFp({ ...m }); setFpOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await delFP.mutateAsync(m.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Facility dialog */}
      <Dialog open={facOpen} onOpenChange={setFacOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{fac.id ? 'Edit' : 'Add'} Facility</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Code *</Label><Input value={fac.facility_code || ''} onChange={(e) => setFac((p) => ({ ...p, facility_code: e.target.value.toUpperCase() }))} /></div>
            <div className="space-y-2"><Label>Name *</Label><Input value={fac.facility_name || ''} onChange={(e) => setFac((p) => ({ ...p, facility_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Country *</Label><Input value={fac.country_code || ''} onChange={(e) => setFac((p) => ({ ...p, country_code: e.target.value.toUpperCase() }))} /></div>
            <div className="space-y-2">
              <Label>Jurisdiction *</Label>
              <Select value={fac.jurisdiction_level} onValueChange={(v) => setFac((p) => ({ ...p, jurisdiction_level: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Provider Type</Label><Input value={fac.provider_type || ''} onChange={(e) => setFac((p) => ({ ...p, provider_type: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={fac.effective_from || ''} onChange={(e) => setFac((p) => ({ ...p, effective_from: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={fac.effective_to || ''} onChange={(e) => setFac((p) => ({ ...p, effective_to: e.target.value || null }))} /></div>
            <div className="col-span-2 space-y-2"><Label>Address</Label><Input value={fac.address || ''} onChange={(e) => setFac((p) => ({ ...p, address: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={fac.is_approved ?? true} onCheckedChange={(v) => setFac((p) => ({ ...p, is_approved: v }))} /><Label>Approved</Label></div>
            <div className="flex items-center gap-2"><Switch checked={fac.is_active ?? true} onCheckedChange={(v) => setFac((p) => ({ ...p, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFacOpen(false)}>Cancel</Button><Button onClick={saveFac} disabled={upsertFac.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facility-Procedure dialog */}
      <Dialog open={fpOpen} onOpenChange={setFpOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{fp.id ? 'Edit' : 'Add'} Availability Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Facility *</Label>
              <Select value={fp.facility_id} onValueChange={(v) => setFp((p) => ({ ...p, facility_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                <SelectContent>{facilities.map((f: any) => <SelectItem key={f.id} value={f.id}>{facName.get(f.id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Procedure *</Label>
              <Select value={fp.procedure_id} onValueChange={(v) => setFp((p) => ({ ...p, procedure_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                <SelectContent>{procedures.map((p: any) => <SelectItem key={p.id} value={p.id}>{procName.get(p.id)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={fp.availability_status} onValueChange={(v) => setFp((p) => ({ ...p, availability_status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={fp.effective_from || ''} onChange={(e) => setFp((p) => ({ ...p, effective_from: e.target.value }))} /></div>
            <div className="col-span-2 space-y-2"><Label>Notes</Label><Input value={fp.notes || ''} onChange={(e) => setFp((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFpOpen(false)}>Cancel</Button><Button onClick={saveFP} disabled={upsertFP.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
