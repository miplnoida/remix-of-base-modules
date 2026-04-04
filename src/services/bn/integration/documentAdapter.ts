/**
 * BN Document Adapter — Bridges to existing document storage system
 * 
 * Uses Supabase Storage (bn-evidence bucket) with metadata in bn_claim_evidence.
 * When migrated to the target DMS, only this file changes.
 */
import { supabase } from '@/integrations/supabase/client';
import type { IBnDocumentAdapter, DocumentRef, DocumentUploadRequest } from './contracts';

const BUCKET = 'bn-evidence';
const db = supabase as any;

export const bnDocumentAdapter: IBnDocumentAdapter = {
  async uploadEvidence(request: DocumentUploadRequest): Promise<DocumentRef> {
    const timestamp = Date.now();
    const safeName = request.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${request.entityType}/${request.entityId}/${timestamp}_${safeName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, request.file, {
        contentType: request.file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return {
      id: storagePath,
      fileName: request.file.name,
      mimeType: request.file.type,
      size: request.file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: '', // filled by caller from auth context
      storageUrl: urlData.publicUrl,
    };
  },

  async getDocument(docRefId: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(docRefId);

    if (error) throw error;
    return data;
  },

  async listDocuments(entityType: string, entityId: string): Promise<DocumentRef[]> {
    const folder = `${entityType}/${entityId}`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder);

    if (error) throw error;
    return (data ?? []).map((f) => ({
      id: `${folder}/${f.name}`,
      fileName: f.name,
      mimeType: (f.metadata as any)?.mimetype || 'application/octet-stream',
      size: (f.metadata as any)?.size || 0,
      uploadedAt: f.created_at || '',
      uploadedBy: '',
      storageUrl: supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
    }));
  },

  async deleteDocument(docRefId: string, _reason: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([docRefId]);
    if (error) throw error;
  },
};
