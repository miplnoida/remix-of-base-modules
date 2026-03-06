import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ExternalApplicationDetail } from '@/types/externalApplication';

// ─── Field-length helpers matching ip_master / ip_depend schemas ─────────────

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

const countryCode3 = (v: string | null | undefined): string | null => {
  if (!v?.trim()) return null;
  return v.trim().slice(0, 3).toUpperCase();
};

/** Gender canonical mapping → M / F / N */
const mapGender = (g: string | null | undefined): string => {
  if (!g) return 'N';
  const u = g.toUpperCase();
  if (u === 'M' || u === 'MALE') return 'M';
  if (u === 'F' || u === 'FEMALE') return 'F';
  return 'N';
};

/** Y/N coercion */
const toYN = (v: boolean | string | null | undefined, fallback: 'Y' | 'N' = 'N'): string => {
  if (v === true  || v === 'Y' || v === 'Yes' || v === 'true')  return 'Y';
  if (v === false || v === 'N' || v === 'No'  || v === 'false') return 'N';
  return fallback;
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConversionValidationError {
  field: string;
  message: string;
}

export interface ConversionResult {
  success: boolean;
  ssn?: string;
  unique_uuid?: string;
  application_id?: string;
  dependants_added?: number;
  workflow_instance_id?: string;
  errors?: ConversionValidationError[];
  message?: string;
}

interface ConversionParams {
  applicationDetail: ExternalApplicationDetail;
  /** Auth UUID of the logged-in user */
  userId: string;
  /** 5-char user_code — used for entered_by / audit fields */
  userCode: string;
  /** Valid tb_relation codes fetched from master (used for client-side pre-check) */
  validRelationCodes: Set<string>;
  sourceRoute?: string;
  /** When converting from /meetings/start/:id, pass the meeting ID so we fetch uploaded docs */
  meetingId?: string;
  /** Application reference to query meeting_uploaded_documents */
  applicationReference?: string;
}

// ─── Client-side preflight validation ────────────────────────────────────────

export function validateApplicationForConversion(
  app: ExternalApplicationDetail
): ConversionValidationError[] {
  const errors: ConversionValidationError[] = [];

  if (!app.firstName?.trim())   errors.push({ field: 'firstName',    message: 'First name is required' });
  if (!app.lastName?.trim())    errors.push({ field: 'lastName',     message: 'Last name is required' });
  if (!app.gender)              errors.push({ field: 'gender',       message: 'Gender is required' });
  if (!app.dateOfBirth)         errors.push({ field: 'dateOfBirth',  message: 'Date of birth is required' });
  if (!app.maritalStatus)       errors.push({ field: 'maritalStatus',message: 'Marital status is required' });
  if (!app.nationality)         errors.push({ field: 'nationality',  message: 'Nationality is required' });
  if (!app.placeOfBirth)        errors.push({ field: 'placeOfBirth', message: 'Place of birth is required' });
  if (!app.title)               errors.push({ field: 'title',        message: 'Title is required' });

  if (app.dateOfBirth && isNaN(new Date(app.dateOfBirth).getTime())) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth is not a valid date' });
  }

  if ((app.maritalStatus === 'Married' || app.maritalStatus === 'Common Law') && !app.dateMarried) {
    errors.push({ field: 'dateMarried', message: 'Date married is required for married/common-law applicants' });
  }

  const wpVal = (app as any).hasWorkPermit ?? (app as any).workPermit;
  if ((wpVal === true || wpVal === 'Y' || wpVal === 'true') && !app.workPermitExpiry) {
    errors.push({ field: 'workPermitExpiry', message: 'Work permit expiry date is required when work permit is set' });
  }

  if (app.nationality && app.nationality.trim().length > 3) {
    errors.push({ field: 'nationality', message: `Nationality code "${app.nationality}" exceeds 3 characters` });
  }

  if (app.placeOfBirth && app.placeOfBirth.trim().length > 3) {
    errors.push({ field: 'placeOfBirth', message: `Place of birth code "${app.placeOfBirth}" exceeds 3 characters` });
  }

  if (app.lastName && app.lastName.trim().length > 25) {
    errors.push({ field: 'lastName', message: `Last name exceeds 25 characters (${app.lastName.trim().length})` });
  }
  if (app.firstName && app.firstName.trim().length > 25) {
    errors.push({ field: 'firstName', message: `First name exceeds 25 characters (${app.firstName.trim().length})` });
  }

  if (app.email && app.email.trim().length > 40) {
    errors.push({ field: 'email', message: `Email exceeds 40 characters (${app.email.trim().length})` });
  }

  return errors;
}

// ─── Build the dependants JSON array for the atomic RPC ──────────────────────

function buildDependantsJson(
  dependants: ExternalApplicationDetail['dependants'],
  validRelationCodes: Set<string>,
  userCode: string
): object[] {
  return (dependants || []).map(dep => {
    // Resolve relation code against master table list (same policy: null if not found)
    const rawCode = dep.relationship?.trim().toUpperCase().slice(0, 3) ?? null;
    const resolvedCode = rawCode && validRelationCodes.has(rawCode) ? rawCode : null;

    return {
      firstName:  dep.firstName  || '',
      lastName:   dep.lastName   || '',
      middleName: dep.middleName || '',
      dob:        safeDate(dep.dateOfBirth),
      gender:     dep.gender     || 'N',
      relationCode: resolvedCode,
      address:    dep.address    || '',
      address1:   (dep as any).address1 || '',
      depSsn:     trim(dep.ssn, 6),
      isInSchool: dep.isInSchool || dep.isSchoolChild || false,
      isInvalid:  dep.isInvalid  || false,
      userCode:   userCode.slice(0, 5),
    };
  });
}

// ─── Build documents array: merge app docs + meeting_uploaded_documents ──────

/** Map verification_category (e.g. "birth") to verification_type (e.g. "birth_status") */
const CATEGORY_TO_VERIFY_TYPE: Record<string, string> = {
  birth: 'birth_status',
  name: 'name_status',
  marital: 'marital_status',
  death: 'death_status',
};

function resolveVerificationType(doc: any): string | null {
  // Prefer explicit verification_type fields first
  const explicit = doc.verificationType || doc.verification_type;
  if (explicit) return explicit;
  // Map verification_category to the _status suffix the RPC expects
  const cat = doc.verification_category;
  if (cat && CATEGORY_TO_VERIFY_TYPE[cat]) return CATEGORY_TO_VERIFY_TYPE[cat];
  // Fallback: if category already looks like a _status value, pass through
  if (cat && cat.endsWith('_status')) return cat;
  return cat || null;
}

function mapDocToRpcFormat(doc: any) {
  return {
    id:               doc.id || null,
    name:             doc.name || doc.fileName || doc.document_name || null,
    fileName:         doc.fileName || doc.name || doc.file_name || null,
    documentType:     doc.documentType || doc.type || doc.document_type || null,
    type:             doc.type || doc.documentType || doc.document_type || null,
    verificationType: resolveVerificationType(doc),
    filePath:         doc.filePath || doc.file_path || null,
    url:              doc.url || doc.storage_url || null,
    signedUrl:        doc.signedUrl || doc.signed_url || null,
    mimeType:         doc.mimeType || doc.mime_type || null,
    fileSize:         doc.fileSize || doc.file_size ? String(doc.fileSize || doc.file_size) : null,
    uploadedAt:       doc.uploadedAt || doc.created_at || null,
    isSupportive:     doc.is_supportive || false,
    supportiveDocType: doc.supportive_doc_type || doc.supportiveDocType || null,
    docCode:          doc.doc_code || doc.docCode || null,
  };
}

async function buildDocumentsForConversion(
  app: ExternalApplicationDetail,
  meetingId?: string,
  applicationReference?: string,
): Promise<object[]> {
  // Start with the documents from the external application payload
  const appDocs = (app.documents || []).map(mapDocToRpcFormat);

  // If conversion is triggered from a meeting, fetch documents uploaded during the meeting
  if (meetingId && applicationReference) {
    console.log(`[buildDocumentsForConversion] Fetching meeting docs for meeting=${meetingId}, appRef=${applicationReference}`);
    
    const { data: meetingDocs, error } = await supabase
      .from('meeting_uploaded_documents')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('application_reference', applicationReference)
      .eq('is_active', true);

    if (error) {
      console.error('[buildDocumentsForConversion] Failed to fetch meeting documents:', error);
      throw new Error(`Failed to fetch meeting documents: ${error.message}. Document transfer aborted.`);
    }

    const meetingMapped = (meetingDocs || []).map(mapDocToRpcFormat);
    console.log(`[buildDocumentsForConversion] Found ${appDocs.length} app doc(s) + ${meetingMapped.length} meeting doc(s)`);

    // Deduplicate by id (meeting docs take precedence)
    const seen = new Set<string>();
    const merged: object[] = [];

    for (const doc of meetingMapped) {
      if ((doc as any).id) seen.add((doc as any).id);
      merged.push(doc);
    }
    for (const doc of appDocs) {
      if ((doc as any).id && seen.has((doc as any).id)) continue;
      merged.push(doc);
    }

    console.log(`[buildDocumentsForConversion] Total documents for conversion: ${merged.length}`);
    return merged;
  }

  console.log(`[buildDocumentsForConversion] No meeting context — using ${appDocs.length} app doc(s)`);
  return appDocs;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConvertToIPRegistration() {
  const queryClient = useQueryClient();
  const [isConverting, setIsConverting] = useState(false);
  const [conversionErrors, setConversionErrors] = useState<ConversionValidationError[]>([]);

  const convert = useCallback(async ({
    applicationDetail,
    userId,
    userCode,
    validRelationCodes,
    meetingId,
    applicationReference,
  }: ConversionParams): Promise<ConversionResult> => {
    setIsConverting(true);
    setConversionErrors([]);

    try {
      // ── Step 1: Client-side preflight ────────────────────────────────────
      const preflightErrors = validateApplicationForConversion(applicationDetail);
      if (preflightErrors.length > 0) {
        setConversionErrors(preflightErrors);
        return {
          success: false,
          errors: preflightErrors,
          message: `Validation failed: ${preflightErrors[0].message}`,
        };
      }

      // ── Step 2: Generate IDs (same as IPRegistrationForm new mode) ────────
      const [{ data: applicationId, error: appIdErr }, { data: tempSsn, error: ssnErr }] = await Promise.all([
        supabase.rpc('generate_application_id'),
        supabase.rpc('generate_temp_ssn'),
      ]);

      if (appIdErr) throw new Error(`Failed to generate application ID: ${appIdErr.message}`);
      if (ssnErr)   throw new Error(`Failed to generate temp SSN: ${ssnErr.message}`);

      const uniqueUuid = crypto.randomUUID();

      // ── Step 3: Resolve parent/spouse combined names ──────────────────────
      const app = applicationDetail;
      const fatherName = app.fatherName || [app.fatherFirstName, app.fatherLastName].filter(Boolean).join(' ') || null;
      const motherName = app.motherName || [app.motherFirstName, app.motherLastName].filter(Boolean).join(' ') || null;
      const spouseName = app.spouseName || [app.spouseFirstName, app.spouseLastName].filter(Boolean).join(' ') || null;

      const npf = toYN((app as any).npfMember ?? app.npf, 'N');
      const citizenshipFlag = toYN((app as any).isCitizen ?? app.citizenship, 'N');

      // ── Step 4: Build dependants JSON for the atomic RPC ─────────────────
      const dependantsJson = buildDependantsJson(app.dependants, validRelationCodes, userCode);

      // ── Step 5: Call the single atomic RPC — everything runs in ONE transaction ──
      const resolvedAppRefNumber = app.referenceNumber || app.id || (app as any).applicationId || null;
      console.log('[useConvertToIPRegistration] Resolved application_ref_number:', {
        referenceNumber: app.referenceNumber,
        id: app.id,
        applicationId: (app as any).applicationId,
        resolved: resolvedAppRefNumber,
      });

      if (!resolvedAppRefNumber) {
        throw new Error('VALIDATION_FAILED: Cannot determine application reference number from referenceNumber, id, or applicationId');
      }

      const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
        'convert_application_atomic',
        {
          p_unique_uuid:           uniqueUuid,
          p_application_id:        applicationId,
          p_temp_ssn:              tempSsn,
          p_name_prefix:           trim(app.title, 6),
          p_firstname:             trim(app.firstName, 25),
          p_middle_name:           trim(app.middleName1 || app.middleName, 25),
          p_second_middle_name:    trim(app.middleName2, 25),
          p_surname:               trim(app.lastName, 25),
          p_name_suffix:           trim(app.suffix, 6),
          p_previous_name:         trim(app.maidenName, 25),
          p_alias:                 trim(app.alias, 25),
          p_sex:                   mapGender(app.gender),
          p_dob:                   safeDate(app.dateOfBirth),
          p_birth_place:           countryCode3(app.placeOfBirth),
          p_nationality:           countryCode3(app.nationality),
          p_marital_status:        trim(app.maritalStatus, 20),
          p_date_married:          safeDate(app.dateMarried ?? undefined),
          p_heightfeet:            app.heightFeet   ?? null,
          p_heightinches:          app.heightInches ?? null,
          p_eyecolor:              trim(app.eyeColor, 10),
          p_resident_addr1:        trim(app.resAddr1 || app.addressLine1, 50),
          p_resident_addr2:        trim(app.resAddr2 || app.addressLine2, 50),
          p_district:              trim(app.resDistrict || app.postalDistrict, 3),
          p_mail_addr1:            trim(app.mailingAddr1, 50),
          p_mail_addr2:            trim(app.mailingAddr2, 50),
          p_email_addr:            trim(app.email, 40),
          p_phone:                 digits(app.phoneHome, 15),
          p_phone_mobile:          digits(app.phoneMobile, 15),
          p_contact:               trim(app.contactName, 35),
          p_contact_relation:      trim(app.contactRelation, 20),
          p_contact_addr1:         trim(app.contactAddress1 || app.contactAddress, 50),
          p_contact_addr2:         trim(app.contactAddress2, 50),
          p_contact_phone:         digits(app.contactPhone, 10),
          p_contact_mobile:        digits(app.contactMobile, 10),
          p_contact_email:         trim(app.contactEmail, 40),
          p_father_name:           trim(fatherName, 35),
          p_mother_name:           trim(motherName, 35),
          p_spouse_name:           trim(spouseName, 35),
          p_spouse_addr1:          trim((app as any).spouseAddressLine1 || (app as any).spouseAddress1, 50),
          p_spouse_addr2:          trim((app as any).spouseAddressLine2 || (app as any).spouseAddress2, 50),
          p_spouse_ssn:            trim(app.spouseSSN, 6),
          p_spouse_dob:            safeDate((app.spouseDOB || app.spouseDateOfBirth) ?? undefined),
          p_witness_name:          trim(app.witnessName, 35),
          p_date_witnessed:        safeDate(app.witnessDate ?? undefined),
          p_beneficiary:           trim(app.beneficiaryName, 35),
          p_ben_addr1:             trim(app.beneficiaryAddress, 50),
          p_ben_addr2:             trim(app.beneficiaryAddress1, 50),
          p_primary_occup:         trim((app.occupationCode || app.occupation || ''), 4),
          p_work_permit:           (() => { const wp = (app as any).hasWorkPermit ?? (app as any).workPermit; return (wp === true || wp === 'Y' || wp === 'y' || wp === 'true' || wp === 'Yes') ? 'Y' : 'N'; })(),
          p_work_permit_expiration: safeDate(app.workPermitExpiry ?? undefined),
          p_npf:                   npf,
          p_citizenship_flag:      citizenshipFlag,
          p_ip_signature:          toYN((app as any).ipSignature ?? (app as any).ip_signature, 'N'),
          p_application_date:      new Date().toISOString().split('T')[0],
          p_date_of_residency:     (app.placeOfBirth && app.placeOfResidency && app.placeOfBirth === app.placeOfResidency) ? null : safeDate(app.residencyDate ?? undefined),
          p_place_of_residence:    countryCode3(app.placeOfResidency),
          p_employer_name:         trim(app.employerName, 50),
          p_employer_address:      trim(app.employerAddress, 200),
          p_employer_phone:        digits(app.employerPhone, 10),
          p_employer_town:         trim(app.employerTown, 50),
          p_entered_by:            userCode.slice(0, 5) || null,
          p_created_by:            userId || null,
          p_photo_location:        trim(app.photoUrl, 255),
          p_remarks:               app.remarks || null,
          p_application_ref_number: resolvedAppRefNumber,
          p_dependants:            dependantsJson,
          p_documents:             await buildDocumentsForConversion(app, meetingId, applicationReference || resolvedAppRefNumber),
        }
      );

      if (rpcError) {
        throw new Error(`Conversion failed: ${rpcError.message}${rpcError.details ? ` | ${rpcError.details}` : ''}`);
      }

      const result = rpcResult as {
        success: boolean;
        ssn?: string;
        ip_master_id?: string;
        unique_uuid?: string;
        dependants_added?: number;
        documents_added?: number;
        application_reference_number?: string;
        workflow_instance_id?: string;
        message?: string;
      };

      if (!result?.success) {
        throw new Error(result?.message || 'Atomic conversion returned failure without a message');
      }

      // ── Step 6: Workflow is now auto-initiated server-side ────────────
      // The convert_application_atomic RPC calls initiate_ip_registration_workflow
      // within the same transaction. The workflow_instance_id is returned in the result.
      if (result.workflow_instance_id) {
        console.log(`[useConvertToIPRegistration] Workflow auto-initiated: ${result.workflow_instance_id}`);
      } else {
        console.log('[useConvertToIPRegistration] No workflow configured or initiation skipped');
      }

      // ── Step 7: Log audit entry for conversion ────────────────────────────
      await supabase.from('ip_audit_log').insert({
        table_name: 'ip_master',
        record_id: result.ip_master_id || null,
        unique_uuid: result.unique_uuid ?? uniqueUuid,
        action: 'CONVERSION',
        changed_by: userId,
        old_value: null,
        new_value: 'P',
        field_name: 'status',
      }).then(({ error }) => {
        if (error) console.error('[useConvertToIPRegistration] Audit log insert failed:', error);
      });

      // ── Step 8: Invalidate caches ─────────────────────────────────────────
      queryClient.invalidateQueries({ queryKey: ['ip-records'] });
      queryClient.invalidateQueries({ queryKey: ['ip_master'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });

      return {
        success: true,
        ssn: result.ssn,
        unique_uuid: result.unique_uuid ?? uniqueUuid,
        application_id: applicationId,
        dependants_added: result.dependants_added ?? 0,
        workflow_instance_id: result.workflow_instance_id || undefined,
        message: result.message,
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useConvertToIPRegistration]', message);

      // Classify error for actionable toasts
      if (message.includes('DUPLICATE_CONVERSION') || message.includes('already been converted')) {
        toast.error('This application has already been converted to an IP record.');
      } else if (message.includes('SUBMIT_FAILED')) {
        toast.error(`Registration submission failed: ${message}`);
      } else if (message.includes('INSERT_FAILED')) {
        toast.error(`Database error during conversion: ${message}`);
      } else if (message.includes('Validation failed')) {
        toast.error(message);
      } else {
        toast.error(`Conversion failed: ${message}`);
      }

      return { success: false, message };
    } finally {
      setIsConverting(false);
    }
  }, [queryClient]);

  return { convert, isConverting, conversionErrors, setConversionErrors };
}
