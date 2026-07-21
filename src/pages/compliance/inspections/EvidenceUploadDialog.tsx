/**
 * Attach Evidence dialog for Compliance Classic.
 * Uploads to the existing `documents` storage bucket and inserts into
 * `ce_inspection_evidence`. Mirrors the write pattern used by
 * fieldAuditService.uploadEvidence, but adds an inspection picker so
 * staff can attach evidence to any inspection from the register page.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EVIDENCE_TYPES = ['DOCUMENT', 'PHOTO', 'PAYROLL', 'SIGNED_SHEET', 'NOTE', 'OTHER'] as const;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selects an inspection when the dialog is opened from a workspace. */
  inspectionId?: string;
}

interface InspectionOption {
  id: string;
  inspection_number: string;
  employer_name: string | null;
  employer_id: string;
  status: string | null;
}

export function EvidenceUploadDialog({ open, onOpenChange, inspectionId }: Props) {
  const qc = useQueryClient();
  const [selectedInspection, setSelectedInspection] = useState<string>('');
  const [findingId, setFindingId] = useState<string>('');
  const [evidenceType, setEvidenceType] = useState<string>('DOCUMENT');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [gpsLat, setGpsLat] = useState<string>('');
  const [gpsLng, setGpsLng] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedInspection(inspectionId ?? '');
      setFindingId('');
      setEvidenceType('DOCUMENT');
      setDescription('');
      setFile(null);
      setGpsLat('');
      setGpsLng('');
    }
  }, [open, inspectionId]);

  const inspectionsQ = useQuery({
    queryKey: ['ce-inspections-picker'],
    enabled: open && !inspectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspections')
        .select('id, inspection_number, employer_name, employer_id, status')
        .order('scheduled_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as InspectionOption[];
    },
  });

  const findingsQ = useQuery({
    queryKey: ['ce-inspection-findings', selectedInspection],
    enabled: open && !!selectedInspection,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspection_findings')
        .select('id, title, finding_type')
        .eq('inspection_id', selectedInspection)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string | null; finding_type: string | null }>;
    },
  });

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude.toFixed(6));
        setGpsLng(pos.coords.longitude.toFixed(6));
      },
      () => toast.error('Unable to read location'),
    );
  };

  const canSubmit = useMemo(() => {
    if (!selectedInspection) return false;
    if (evidenceType === 'NOTE') return description.trim().length > 0;
    return !!file;
  }, [selectedInspection, evidenceType, description, file]);

  const upload = useMutation({
    mutationFn: async () => {
      let file_name = description.trim().slice(0, 80) || 'Note';
      let file_url = '';
      let file_size = 0;

      if (file) {
        if (file.size > MAX_FILE_SIZE) throw new Error('File exceeds 25 MB limit');
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `compliance/evidence/${selectedInspection}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
        file_name = file.name;
        file_url = urlData.publicUrl;
        file_size = file.size;
      }

      const { data: userData } = await supabase.auth.getUser();
      const capturedBy = userData?.user?.email ?? userData?.user?.id ?? null;

      const { error } = await supabase.from('ce_inspection_evidence').insert({
        inspection_id: selectedInspection,
        finding_id: findingId || null,
        evidence_type: evidenceType,
        file_name,
        file_url,
        file_size,
        description: description.trim() || null,
        gps_lat: gpsLat ? Number(gpsLat) : null,
        gps_lng: gpsLng ? Number(gpsLng) : null,
        captured_at: new Date().toISOString(),
        captured_by: capturedBy,
        created_by: capturedBy,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Evidence attached');
      qc.invalidateQueries({ queryKey: ['ce-evidence-list'] });
      qc.invalidateQueries({ queryKey: ['inspection-evidence'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to attach evidence'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach Evidence</DialogTitle>
          <DialogDescription>
            Attach a document, photo, payroll record, or note to an inspection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!inspectionId && (
            <div className="space-y-1.5">
              <Label>Inspection *</Label>
              <Select value={selectedInspection} onValueChange={setSelectedInspection}>
                <SelectTrigger><SelectValue placeholder="Select an inspection" /></SelectTrigger>
                <SelectContent>
                  {(inspectionsQ.data ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.inspection_number} — {i.employer_name ?? i.employer_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={evidenceType} onValueChange={setEvidenceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Finding (optional)</Label>
              <Select value={findingId || 'none'} onValueChange={(v) => setFindingId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {(findingsQ.data ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.title ?? f.finding_type ?? f.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>File {evidenceType === 'NOTE' ? '(optional for notes)' : '*'}</Label>
            <Input
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} • {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this evidence and where was it obtained?"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">GPS Lat</Label>
              <Input value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} placeholder="17.30" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GPS Lng</Label>
              <Input value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} placeholder="-62.72" />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={captureGps} title="Use current location">
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>Cancel</Button>
          <Button onClick={() => upload.mutate()} disabled={!canSubmit || upload.isPending}>
            {upload.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Attach Evidence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
