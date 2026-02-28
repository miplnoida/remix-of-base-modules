import { format, parseISO } from 'date-fns';

// --- Core interfaces ---

export interface UnifiedDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  verification_category?: string | null;
  supportive_doc_type?: string | null;
  is_supportive?: boolean;
  source: 'external' | 'platform';
  url?: string;
  doc_code?: string | null;
  is_active?: boolean;
}

export interface VerificationCategory {
  id: string;
  label: string;
  fieldKey: string;
  isMandatory: boolean;
  tooltip: string;
  autoSelectCode?: string;
}

export interface UploadSlot {
  key: string;
  label: string;
  categoryId: string;
  isSupportive: boolean;
  docCode: string;
  docDescription: string;
  satisfiedByMandatory?: boolean;
  satisfiedByCategoryId?: string;
  needsReupload?: boolean;
}

export interface PreviewDoc {
  url: string;
  name: string;
  category: 'pdf' | 'image' | 'other';
}

export interface DocTypeMismatch {
  categoryLabel: string;
  selectedType: string;
  documentType: string;
}

// --- Adapter interface ---

export interface DocumentPersistenceAdapter {
  fetchDocuments(): Promise<UnifiedDocument[]>;
  uploadFile(file: File, storagePath: string): Promise<string>; // returns public URL
  insertRecord(doc: Record<string, any>): Promise<void>;
  deactivateByCategory?(categoryId: string, isSupportive: boolean): Promise<void>;
  deleteDocument(doc: UnifiedDocument): Promise<void>;
  downloadFile?(filePath: string): Promise<Blob>;
}

// --- Constants ---

export const CODES_REQUIRING_SUPPORTIVE = ['B', 'V'];
export const SUPPORTIVE_DOC_CODES = ['I', 'L'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.tif', '.tiff'];
export const ACCEPTED_MIME_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/tiff'
];

export const CATEGORY_TO_VERIFY_TYPE: Record<string, string> = {
  birth: 'birth_status',
  name: 'name_status',
  marital: 'marital_status',
  death: 'death_status',
};

export const VERIFY_TYPE_TO_CATEGORY: Record<string, string> = {
  birth_status: 'birth',
  name_status: 'name',
  marital_status: 'marital',
  death_status: 'death',
};

export const CATEGORY_FIELD_KEY_MAP: Record<string, string> = {
  birth: 'birth_doc_type',
  name: 'name_doc_type',
  marital: 'marital_doc_type',
  death: 'death_doc_type',
};

export const EXTERNAL_DOC_TYPE_TO_VERIFY_CODE: Record<string, string> = {
  birth_certificate: 'B', 'Birth Certificate': 'B',
  baptism_certificate: 'V', 'Baptism Certificate': 'V',
  adoption_certificate: 'E', 'Adoption Certificate': 'E',
  passport: 'P', Passport: 'P',
  identification_card: 'I', 'Identification Card': 'I', id_card: 'I',
  identification_letter: 'L', 'Identification Letter': 'L',
  deed_poll: 'D', 'Deed Poll': 'D',
  marriage_certificate: 'M', 'Marriage Certificate': 'M',
  affidavit: 'A', Affidavit: 'A',
  divorce_certificate: 'X', 'Divorce Certificate': 'X',
  death_certificate: 'C', certificate_of_death: 'C', 'Certificate of Death': 'C',
  photo: 'I', national_id: 'I', document_not_available: 'N',
};

// --- Helper functions ---

export function formatSize(size?: number | null): string {
  if (size === undefined || size === null) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM dd, yyyy'); } catch { return dateStr; }
}

export function resolveExternalDocTypeToCode(rawType: string | null | undefined): string | null {
  if (!rawType) return null;
  if (EXTERNAL_DOC_TYPE_TO_VERIFY_CODE[rawType]) return EXTERNAL_DOC_TYPE_TO_VERIFY_CODE[rawType];
  const lower = rawType.toLowerCase().replace(/[\s-]+/g, '_');
  for (const [key, code] of Object.entries(EXTERNAL_DOC_TYPE_TO_VERIFY_CODE)) {
    if (key.toLowerCase().replace(/[\s-]+/g, '_') === lower) return code;
  }
  if (rawType.length === 1 && 'ABCDEILMNPVX'.includes(rawType.toUpperCase())) return rawType.toUpperCase();
  return null;
}

export function mapExternalDocs(apiDocs: any[]): UnifiedDocument[] {
  if (!apiDocs || !Array.isArray(apiDocs)) return [];
  return apiDocs.map((d, idx) => {
    const rawDocType = d.documentType || d.type || d.document_type || '';
    const resolvedCode = resolveExternalDocTypeToCode(rawDocType);
    return {
      id: d.id || `ext-${idx}`,
      document_type: rawDocType || d.verificationType || '',
      document_name: d.fileName || d.name || d.file_name || d.document_name || 'Unknown',
      file_path: d.filePath || d.file_path || '',
      file_size: typeof d.fileSize === 'number' ? d.fileSize : (parseInt(d.fileSize, 10) || 0),
      uploaded_at: d.uploadedAt || d.uploaded_at || '',
      verification_category: VERIFY_TYPE_TO_CATEGORY[d.verificationType as string] || null,
      supportive_doc_type: null,
      is_supportive: false,
      source: 'external' as const,
      url: d.signedUrl || d.url || d.filePath || '',
      doc_code: resolvedCode,
      is_active: true,
    };
  });
}

export function mapPlatformDocs(rows: any[]): UnifiedDocument[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(d => ({
    id: d.id,
    document_type: d.document_type || d.document_name || '',
    document_name: d.file_name || d.document_name || '',
    file_path: d.file_path || '',
    file_size: d.file_size || 0,
    uploaded_at: d.created_at || d.uploaded_at || '',
    verification_category: d.verification_category || null,
    supportive_doc_type: d.supportive_doc_type || null,
    is_supportive: d.is_supportive ?? false,
    source: 'platform' as const,
    url: d.storage_url || d.url || '',
    doc_code: d.doc_code || null,
    is_active: d.is_active ?? true,
  }));
}

export function mergeDocuments(externalDocs: UnifiedDocument[], platformDocs: UnifiedDocument[]): UnifiedDocument[] {
  const platformReplacedCategories = new Set<string>();
  for (const doc of platformDocs) {
    if (doc.is_active && doc.verification_category && !doc.is_supportive) {
      platformReplacedCategories.add(doc.verification_category);
    }
  }
  const seen = new Set<string>();
  const result: UnifiedDocument[] = [];
  for (const doc of externalDocs) {
    const key = doc.url || doc.file_path || doc.id;
    if (key && !seen.has(key)) {
      if (doc.verification_category && platformReplacedCategories.has(doc.verification_category)) continue;
      seen.add(key);
      result.push(doc);
    }
  }
  for (const doc of platformDocs) {
    const key = doc.url || doc.file_path || doc.id;
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(doc);
    }
  }
  return result;
}

export function getFileCategory(fileName: string, mimeType?: string): 'pdf' | 'image' | 'other' {
  const name = fileName.toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return 'image';
  return 'other';
}
