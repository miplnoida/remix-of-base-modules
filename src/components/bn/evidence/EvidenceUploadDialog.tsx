import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUploadEvidence } from '@/hooks/bn/useBnEvidence';
import { useUserCode } from '@/hooks/useUserCode';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  preselectedTypeCode?: string;
  preselectedName?: string;
  requirementId?: string | null;
  allowedExtensions?: string[];
  maxFileSizeMb?: number;
}

export function EvidenceUploadDialog({
  open, onOpenChange, claimId,
  preselectedTypeCode, preselectedName, requirementId,
  allowedExtensions, maxFileSizeMb = 10,
}: Props) {
  const { toast } = useToast();
  const uploadMutation = useUploadEvidence();
  const userCode = useUserCode();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState(preselectedName || '');
  const [source, setSource] = useState('UPLOAD');
  const [notes, setNotes] = useState('');
  const [fileError, setFileError] = useState('');

  const validateFile = (f: File): boolean => {
    setFileError('');
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (allowedExtensions && allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      setFileError(`File type .${ext} not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      return false;
    }
    const sizeMb = f.size / (1024 * 1024);
    if (sizeMb > maxFileSizeMb) {
      setFileError(`File size ${sizeMb.toFixed(1)}MB exceeds limit of ${maxFileSizeMb}MB`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) {
      setFile(f);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) { toast({ title: 'No file selected', variant: 'destructive' }); return; }
    if (!documentName.trim()) { toast({ title: 'Document name required', variant: 'destructive' }); return; }

    try {
      await uploadMutation.mutateAsync({
        claimId,
        file,
        documentTypeCode: preselectedTypeCode || 'GENERAL',
        documentName: documentName.trim(),
        requirementId: requirementId || null,
        source,
        notes: notes.trim() || undefined,
        enteredBy: userCode || 'SYSTEM',
      });
      toast({ title: 'Document uploaded successfully' });
      onOpenChange(false);
      setFile(null);
      setDocumentName('');
      setNotes('');
      setFileError('');
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload Evidence Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Name *</Label>
            <Input value={documentName} onChange={e => setDocumentName(e.target.value)} placeholder="e.g. Birth Certificate" />
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UPLOAD">Upload</SelectItem>
                <SelectItem value="SCAN">Scanned Document</SelectItem>
                <SelectItem value="ONLINE">Online Submission</SelectItem>
                <SelectItem value="LEGACY">Legacy Import</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>File *</Label>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/30"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Click or drag to upload</p>
                  <p className="text-xs text-muted-foreground">Max {maxFileSizeMb}MB • {allowedExtensions?.join(', ') || 'pdf, jpg, png'}</p>
                </>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
                accept={allowedExtensions?.map(e => `.${e}`).join(',') || '.pdf,.jpg,.jpeg,.png'} />
            </div>
            {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes about this document" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploadMutation.isPending || !file}>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
