import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { IPFormData } from '../IPRegistrationForm';
import { Upload, File, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentVerificationTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
}

interface UploadedDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

const maritalDocTypes = ['Marriage Certificate', 'Divorce Decree', 'Death Certificate of Spouse', 'Affidavit', 'Not Applicable'];
const birthDocTypes = ['Birth Certificate', 'Passport', 'Hospital Record', 'Baptismal Certificate'];
const deathDocTypes = ['Death Certificate', 'Coroner Report', 'Hospital Record', 'Not Applicable'];
const nameDocTypes = ['Birth Certificate', 'Passport', 'Driver License', 'National ID', 'Deed Poll'];

export default function DocumentVerificationTab({ formData, onChange, onSave, errors, isEditable }: DocumentVerificationTabProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ip_documents')
        .select('*')
        .eq('unique_uuid', formData.unique_uuid)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [formData.unique_uuid]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.unique_uuid}/${documentType}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('ip-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save reference to database
      const { error: dbError } = await supabase
        .from('ip_documents')
        .insert({
          unique_uuid: formData.unique_uuid,
          document_type: documentType,
          document_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
          is_temp: true,
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: UploadedDocument) => {
    try {
      // Delete from storage
      await supabase.storage.from('ip-documents').remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase
        .from('ip_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (doc: UploadedDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('ip-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.document_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Document Verification</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Marital Status Verification */}
        <div className="space-y-2">
          <Label htmlFor="marital_doc_type">Marital Status Verification</Label>
          <Select 
            value={formData.marital_doc_type || ''} 
            onValueChange={(v) => { onChange('marital_doc_type', v); onSave({ marital_doc_type: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Document Type" />
            </SelectTrigger>
            <SelectContent>
              {maritalDocTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Birth Status Verification */}
        <div className="space-y-2">
          <Label htmlFor="birth_doc_type">
            Birth Status Verification <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={formData.birth_doc_type || ''} 
            onValueChange={(v) => { onChange('birth_doc_type', v); onSave({ birth_doc_type: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.birth_doc_type ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Document Type" />
            </SelectTrigger>
            <SelectContent>
              {birthDocTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.birth_doc_type && <p className="text-xs text-destructive">{errors.birth_doc_type}</p>}
        </div>

        {/* Death Status Verification */}
        <div className="space-y-2">
          <Label htmlFor="death_doc_type">Death Status Verification</Label>
          <Select 
            value={formData.death_doc_type || ''} 
            onValueChange={(v) => { onChange('death_doc_type', v); onSave({ death_doc_type: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Document Type" />
            </SelectTrigger>
            <SelectContent>
              {deathDocTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Name Status Verification */}
        <div className="space-y-2">
          <Label htmlFor="name_doc_type">
            Name Status Verification <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={formData.name_doc_type || ''} 
            onValueChange={(v) => { onChange('name_doc_type', v); onSave({ name_doc_type: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.name_doc_type ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Document Type" />
            </SelectTrigger>
            <SelectContent>
              {nameDocTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.name_doc_type && <p className="text-xs text-destructive">{errors.name_doc_type}</p>}
        </div>
      </div>

      {/* Document Upload Section */}
      {isEditable && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Upload Supporting Documents</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Birth Certificate', 'ID Document', 'Marriage Certificate', 'Other'].map((docType) => (
              <Card key={docType}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{docType}</span>
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, docType)}
                        disabled={uploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={uploading}>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload'}
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>
          
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type} • {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {isEditable && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
