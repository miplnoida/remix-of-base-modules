import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileIcon, Upload, Image, FileText, Trash2 } from 'lucide-react';
import { InspectionVisit, InspectionVisitStatus, EvidenceType } from '@/types/inspectionTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EvidenceTabContentProps {
  visit: InspectionVisit;
}

interface EvidenceItem {
  id: string;
  evidence_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  description: string | null;
  captured_at: string;
  captured_by: string | null;
  finding_id: string | null;
}

export function EvidenceTabContent({ visit }: EvidenceTabContentProps) {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [evidenceType, setEvidenceType] = useState<string>(EvidenceType.PHOTO);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isReadOnly = visit.visitStatus === InspectionVisitStatus.COMPLETED;

  useEffect(() => {
    loadEvidence();
  }, [visit.id]);

  const loadEvidence = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ce_inspection_evidence')
        .select('*')
        .eq('inspection_id', visit.id)
        .order('captured_at', { ascending: false });

      if (error) throw error;
      setEvidence(data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const fileName = `inspections/${visit.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      let fileUrl = '';
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      } else {
        fileUrl = URL.createObjectURL(selectedFile);
      }

      // Insert into normalized evidence table
      const { error } = await supabase
        .from('ce_inspection_evidence')
        .insert({
          inspection_id: visit.id,
          evidence_type: evidenceType,
          file_name: selectedFile.name,
          file_url: fileUrl,
          file_size: selectedFile.size,
          description: description || null,
          captured_at: new Date().toISOString(),
          captured_by: 'SYSTEM',
          created_by: 'SYSTEM',
        });

      if (error) throw error;

      toast.success('Evidence uploaded successfully');
      setSelectedFile(null);
      setDescription('');
      loadEvidence();
    } catch (error) {
      toast.error('Failed to upload evidence');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ce_inspection_evidence')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Evidence removed');
      loadEvidence();
    } catch (error) {
      toast.error('Failed to delete evidence');
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case EvidenceType.PHOTO:
        return <Image className="h-5 w-5" />;
      case EvidenceType.DOCUMENT:
        return <FileText className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Upload Form */}
      {!isReadOnly && (
        <div className="space-y-4 p-4 border rounded-lg bg-accent/50">
          <h3 className="font-medium">Upload Evidence</h3>

          <div className="space-y-2">
            <Label>Evidence Type</Label>
            <Select value={evidenceType} onValueChange={setEvidenceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EvidenceType.PHOTO}>Photo</SelectItem>
                <SelectItem value={EvidenceType.DOCUMENT}>Document</SelectItem>
                <SelectItem value={EvidenceType.AUDIO}>Audio</SelectItem>
                <SelectItem value={EvidenceType.VIDEO}>Video</SelectItem>
                <SelectItem value={EvidenceType.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>File</Label>
            <Input
              type="file"
              onChange={handleFileChange}
              accept={evidenceType === EvidenceType.PHOTO ? 'image/*' : '*/*'}
            />
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the evidence..."
              rows={2}
            />
          </div>

          <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Evidence'}
          </Button>
        </div>
      )}

      {/* Evidence List */}
      <div className="space-y-3">
        <h3 className="font-medium">Uploaded Evidence ({evidence.length})</h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : evidence.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No evidence uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div className="text-muted-foreground">
                  {getEvidenceIcon(item.evidence_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.file_name}</div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(item.captured_at).toLocaleString()} • {item.captured_by ?? 'Inspector'}
                    {item.file_size ? ` • ${(item.file_size / 1024).toFixed(1)} KB` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" asChild>
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                  {!isReadOnly && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
