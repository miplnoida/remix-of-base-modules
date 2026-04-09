import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGlobalBlocking } from '@/contexts/GlobalBlockingContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const trim = (v: string | null | undefined, max: number): string | null => {
  if (!v?.trim()) return null;
  return v.trim().slice(0, max);
};

const digits = (v: string | null | undefined, max: number): string | null => {
  if (!v) return null;
  const d = v.replace(/\D/g, '');
  return d.length > 0 ? d.slice(0, max) : null;
};

const safeDate = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

const toYN = (v: boolean | string | null | undefined, fallback: 'Y' | 'N' = 'N'): string => {
  if (v === true  || v === 'Y' || v === 'Yes' || v === 'true')  return 'Y';
  if (v === false || v === 'N' || v === 'No'  || v === 'false') return 'N';
  return fallback;
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmployerConversionValidationError {
  field: string;
  message: string;
}

export interface EmployerConversionResult {
  success: boolean;
  regno?: string;
  errors?: EmployerConversionValidationError[];
  message?: string;
  documentsAdded?: number;
}

interface EmployerConversionParams {
  applicationData: Record<string, any>;
  userId: string;
  userCode: string;
  applicationReference?: string;
  meetingId?: string;
}

// ─── Client-side preflight validation ───────────────────────────────────────

export function validateEmployerApplicationForConversion(
  app: Record<string, any>
): EmployerConversionValidationError[] {
  const errors: EmployerConversionValidationError[] = [];

  if (!app.employer_name?.trim()) {
    errors.push({ field: 'employer_name', message: 'Employer name is required' });
  }

  if (!app.email?.trim() && !app.business_email?.trim() && !app.contact_telephone?.trim() && !app.mobile?.trim()) {
    errors.push({ field: 'contact', message: 'At least one contact method (email, phone, or mobile) is required' });
  }

  if (app.employer_name && app.employer_name.trim().length > 40) {
    errors.push({ field: 'employer_name', message: `Employer name exceeds 40 characters (${app.employer_name.trim().length})` });
  }

  if (!app.ownership_code?.trim()) {
    errors.push({ field: 'ownership_code', message: 'Ownership type is required' });
  }

  return errors;
}

// ─── Document builder (matches IP flow pattern) ─────────────────────────────

function mapDocToRpcFormat(doc: Record<string, any>): Record<string, any> {
  return {
    file_name: doc.file_name || doc.fileName || doc.name || doc.document_name || 'unknown',
    file_path: doc.file_path || doc.filePath || '',
    storage_url: doc.storage_url || doc.url || doc.signed_url || doc.download_url || '',
    document_type: doc.document_type || doc.type || doc.documentType || null,
    document_description: doc.document_description || doc.document_name || doc.file_name || null,
    doc_code: doc.doc_code || null,
    mime_type: doc.mime_type || doc.mimeType || null,
    file_size: doc.file_size || doc.fileSize || null,
    uploaded_by: doc.uploaded_by || null,
    uploaded_by_code: doc.uploaded_by_code || null,
    is_supportive: doc.is_supportive ?? false,
    metadata: doc.metadata || null,
  };
}

async function buildEmployerDocumentsForConversion(
  applicationData: Record<string, any>,
  meetingId?: string,
  applicationReference?: string,
  userCode?: string,
): Promise<object[]> {
  // Start with the documents from the external application payload
  const appDocs = (applicationData.documents || []).map(mapDocToRpcFormat);

  // If conversion is triggered from a meeting, fetch documents uploaded during the meeting
  if (meetingId && applicationReference) {
    console.log(`[buildEmployerDocumentsForConversion] Fetching meeting docs for meeting=${meetingId}, appRef=${applicationReference}`);

    const { data: meetingDocs, error } = await supabase
      .from('meeting_uploaded_documents')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('application_reference', applicationReference)
      .eq('is_active', true);

    if (error) {
      console.error('[buildEmployerDocumentsForConversion] Failed to fetch meeting documents:', error);
      throw new Error(`Failed to fetch meeting documents: ${error.message}. Document transfer aborted.`);
    }

    const meetingMapped = (meetingDocs || []).map(mapDocToRpcFormat);
    console.log(`[buildEmployerDocumentsForConversion] Found ${appDocs.length} app doc(s) + ${meetingMapped.length} meeting doc(s)`);

    // Deduplicate: meeting docs take precedence (by document_type)
    const seen = new Set<string>();
    const merged: object[] = [];

    for (const doc of meetingMapped) {
      const key = (doc as any).document_type || (doc as any).doc_code || '';
      if (key) seen.add(key);
      merged.push(doc);
    }
    for (const doc of appDocs) {
      const key = (doc as any).document_type || (doc as any).doc_code || '';
      if (key && seen.has(key)) continue;
      merged.push(doc);
    }

    console.log(`[buildEmployerDocumentsForConversion] Total documents for conversion: ${merged.length}`);
    return merged;
  }

  console.log(`[buildEmployerDocumentsForConversion] No meeting context — using ${appDocs.length} app doc(s)`);
  return appDocs;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useConvertToEmployerRegistration() {
  const queryClient = useQueryClient();
  const [isConverting, setIsConverting] = useState(false);
  const [conversionErrors, setConversionErrors] = useState<EmployerConversionValidationError[]>([]);
  const { startBlocking, stopBlocking } = useGlobalBlocking();

  const convert = useCallback(async ({
    applicationData,
    userId,
    userCode,
    applicationReference,
    meetingId,
  }: EmployerConversionParams): Promise<EmployerConversionResult> => {
    setIsConverting(true);
    setConversionErrors([]);
    startBlocking('Converting to Employer Registration...');

    try {
      // ── Step 1: Client-side preflight ──────────────────────────────────
      const preflightErrors = validateEmployerApplicationForConversion(applicationData);
      if (preflightErrors.length > 0) {
        setConversionErrors(preflightErrors);
        toast.error(`Validation failed: ${preflightErrors[0].message}`, { duration: 6000 });
        return { success: false, errors: preflightErrors, message: preflightErrors[0].message };
      }

      const app = applicationData;
      const resolvedAppRef = applicationReference || app.registration_id || app.id || null;

      // ── Step 2: Build owners JSON ─────────────────────────────────────
      const ownersJson = (app.owners || []).map((o: any) => ({
        name: trim(o.name, 40),
        title: trim(o.title, 30),
        phone: digits(o.phone, 10),
        mobile: digits(o.mobile, 10),
        email: trim(o.email, 40),
        ssn: trim(o.ssn, 6),
      }));

      // ── Step 3: Build locations JSON ──────────────────────────────────
      const locationsJson = (app.locations || []).map((l: any) => ({
        trade_name: trim(l.trade_name, 40),
        loc_addr1: trim(l.address1 || l.loc_addr1, 25),
        loc_addr2: trim(l.address2 || l.loc_addr2, 25),
        activity_type: trim(l.activity_type, 50),
      }));

      // ── Step 4: Build notes JSON ──────────────────────────────────────
      const notesJson = (app.remarks || []).map((r: any) => ({
        note: trim(r.note, 500),
        note_date: safeDate(r.note_date) || new Date().toISOString().split('T')[0],
        user_id: trim(r.created_by || userCode, 50),
      }));

      // ── Step 5: Build documents JSON (atomic — merged from API + meeting) ──
      const documentsJson = await buildEmployerDocumentsForConversion(
        app, meetingId, resolvedAppRef, userCode
      );
      console.log(`[useConvertToEmployerRegistration] Passing ${documentsJson.length} document(s) to RPC`);

      // ── Step 6: Call the RPC ──────────────────────────────────────────
      const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
        'convert_application_to_employer',
        {
          p_application_reference: resolvedAppRef,
          p_employer_name: trim(app.employer_name, 40),
          p_trade_name: trim(app.trade_name, 40),
          p_phone: digits(app.contact_telephone, 10),
          p_fax: digits(app.contact_fax, 10),
          p_hq_addr1: trim(app.hq_address1, 25),
          p_hq_addr2: trim(app.hq_address2, 25),
          p_maddr1: trim(app.mailing_address1, 25),
          p_maddr2: trim(app.mailing_address2, 25),
          p_email: trim(app.email || app.business_email, 40),
          p_mobile: digits(app.mobile, 10),
          p_office_code: trim(app.office_code, 3),
          p_ownership_code: trim(app.ownership_code, 3),
          p_sector_code: trim(app.sector_code, 1),
          p_industrial_code: trim(app.industrial_code, 4),
          p_village_code: trim(app.village_code, 3),
          p_activity_type: trim(app.activity_type, 50),
          p_inspector_code: trim(app.inspector_code, 3),
          p_males_employed: app.male_count ?? null,
          p_females_employed: app.female_count ?? null,
          p_date_wages_first_paid: safeDate(app.wages_first_paid_date),
          p_application_date: safeDate(app.application_date) || new Date().toISOString().split('T')[0],
          p_date_incorporated: safeDate(app.incorporated_date),
          p_date_of_acquisition: safeDate(app.date_acquired),
          p_previous_owner: trim(app.previous_owner, 40),
          p_prev_owner_addr1: trim(app.prev_owner_address1, 25),
          p_prev_owner_addr2: trim(app.prev_owner_address2, 25),
          p_computer_payroll: toYN(app.computer_payroll, 'N'),
          p_make_model: trim(app.make_model, 30),
          p_acquired_code: toYN(app.is_acquired, 'N'),
          p_parent_regno: trim(app.parent_reg_no, 6),
          p_registry_num: trim(app.registry_num, 30),
          p_entered_by: trim(userCode, 50),
          p_user_id: userId,
          p_owners_json: JSON.stringify(ownersJson),
          p_locations_json: JSON.stringify(locationsJson),
          p_notes_json: JSON.stringify(notesJson),
          p_documents_json: JSON.stringify(documentsJson),
        }
      );

      if (rpcError) {
        console.error('[useConvertToEmployerRegistration] RPC error:', rpcError);
        const message = rpcError.message || 'Failed to create employer registration';
        toast.error(message, { duration: 8000 });
        return { success: false, message };
      }

      const result = rpcResult as any;
      if (!result?.success) {
        const message = result?.message || 'Conversion failed';
        toast.error(message, { duration: 8000 });
        return { success: false, message };
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['er-master'] });
      queryClient.invalidateQueries({ queryKey: ['employer-registrations'] });

      return {
        success: true,
        regno: result.regno,
        documentsAdded: result.documents_added || 0,
        message: result.message || `Employer Registration ${result.regno} created successfully`,
      };
    } catch (err) {
      console.error('[useConvertToEmployerRegistration] Error:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(message, { duration: 8000 });
      return { success: false, message };
    } finally {
      setIsConverting(false);
      stopBlocking();
    }
  }, [queryClient, startBlocking, stopBlocking]);

  return { convert, isConverting, conversionErrors };
}
