import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ExternalApplicationDetail } from '@/types/externalApplication';
import { validateIPRegistrationForSubmit } from '@/hooks/useIPRegistrationSubmit';

// ─── Field-length helpers matching ip_master schema ─────────────────────────
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
const mapGender = (g: string | null | undefined): string | null => {
  if (!g) return null;
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
  dependants_skipped?: number;
  errors?: ConversionValidationError[];
  message?: string;
}

interface ConversionParams {
  applicationDetail: ExternalApplicationDetail;
  /** Auth UUID of the user triggering conversion */
  userId: string;
  /** 5-char user_code of the logged-in user — used for entered_by / submitted_by */
  userCode: string;
  /** Valid tb_relation codes fetched from master */
  validRelationCodes: Set<string>;
  sourceRoute?: string;
}

// ─── Client-side preflight validation ────────────────────────────────────────
export function validateApplicationForConversion(
  app: ExternalApplicationDetail
): ConversionValidationError[] {
  const errors: ConversionValidationError[] = [];

  // Required fields
  if (!app.firstName?.trim())   errors.push({ field: 'firstName',    message: 'First name is required' });
  if (!app.lastName?.trim())    errors.push({ field: 'lastName',     message: 'Last name is required' });
  if (!app.gender)              errors.push({ field: 'gender',       message: 'Gender is required' });
  if (!app.dateOfBirth)         errors.push({ field: 'dateOfBirth',  message: 'Date of birth is required' });
  if (!app.maritalStatus)       errors.push({ field: 'maritalStatus',message: 'Marital status is required' });
  if (!app.nationality)         errors.push({ field: 'nationality',  message: 'Nationality is required' });
  if (!app.placeOfBirth)        errors.push({ field: 'placeOfBirth', message: 'Place of birth is required' });
  if (!app.title)               errors.push({ field: 'title',        message: 'Title is required' });

  // Date of birth validity
  if (app.dateOfBirth && isNaN(new Date(app.dateOfBirth).getTime())) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth is not a valid date' });
  }

  // Marital + date married
  if ((app.maritalStatus === 'Married' || app.maritalStatus === 'Common Law') && !app.dateMarried) {
    errors.push({ field: 'dateMarried', message: 'Date married is required for married/common-law applicants' });
  }

  // Work permit expiry
  if (app.hasWorkPermit && !app.workPermitExpiry) {
    errors.push({ field: 'workPermitExpiry', message: 'Work permit expiry date is required when work permit is set' });
  }

  // Nationality max 3 chars (country code)
  if (app.nationality && app.nationality.trim().length > 3) {
    errors.push({ field: 'nationality', message: `Nationality code "${app.nationality}" exceeds 3 characters` });
  }

  // Place of birth max 3 chars
  if (app.placeOfBirth && app.placeOfBirth.trim().length > 3) {
    errors.push({ field: 'placeOfBirth', message: `Place of birth code "${app.placeOfBirth}" exceeds 3 characters` });
  }

  // Name length limits (ip_master: surname/firstname varchar(25))
  if (app.lastName && app.lastName.trim().length > 25) {
    errors.push({ field: 'lastName', message: `Last name exceeds 25 characters (${app.lastName.trim().length})` });
  }
  if (app.firstName && app.firstName.trim().length > 25) {
    errors.push({ field: 'firstName', message: `First name exceeds 25 characters (${app.firstName.trim().length})` });
  }

  // Email max 40
  if (app.email && app.email.trim().length > 40) {
    errors.push({ field: 'email', message: `Email exceeds 40 characters (${app.email.trim().length})` });
  }

  return errors;
}

// ─── Map application → ip_master insert payload ──────────────────────────────
function buildIPMasterInsert(
  app: ExternalApplicationDetail,
  uniqueUuid: string,
  applicationId: string,
  tempSsn: string,
  userId: string,
  userCode: string
): Record<string, unknown> {
  const fatherName = app.fatherName || [app.fatherFirstName, app.fatherLastName].filter(Boolean).join(' ') || null;
  const motherName = app.motherName || [app.motherFirstName, app.motherLastName].filter(Boolean).join(' ') || null;
  const spouseName = app.spouseName || [app.spouseFirstName, app.spouseLastName].filter(Boolean).join(' ') || null;

  const npf  = toYN((app as any).npfMember ?? app.npf, 'N');
  const citizenshipFlag = toYN((app as any).isCitizen ?? app.citizenship, 'N');

  return {
    unique_uuid:            uniqueUuid,
    application_id:         applicationId,
    ssn:                    tempSsn,
    status:                 'Z', // Draft — submit_ip_registration will move to P

    // Personal
    name_prefix:            trim(app.title, 6),
    firstname:              trim(app.firstName, 25)!,
    middle_name:            trim(app.middleName1 || app.middleName, 25),
    second_middle_name:     trim(app.middleName2, 25),
    surname:                trim(app.lastName, 25)!,
    name_suffix:            trim(app.suffix, 6),
    previous_name:          trim(app.maidenName, 25),
    alias:                  trim(app.alias, 25),
    sex:                    mapGender(app.gender)!,
    dob:                    safeDate(app.dateOfBirth)!,
    birth_place:            countryCode3(app.placeOfBirth),
    nationality:            countryCode3(app.nationality)!,
    marital_status:         trim(app.maritalStatus, 20)!,
    date_married:           safeDate(app.dateMarried ?? undefined),
    heightfeet:             app.heightFeet   ?? null,
    heightinches:           app.heightInches ?? null,
    eyecolor:               trim(app.eyeColor, 10),

    // Address
    resident_addr1:         trim(app.resAddr1 || app.addressLine1, 30),
    resident_addr2:         trim(app.resAddr2 || app.addressLine2, 30),
    district:               trim(app.resDistrict || app.postalDistrict, 3),
    mail_addr1:             trim(app.mailingAddr1, 30),
    mail_addr2:             trim(app.mailingAddr2, 30),

    // Contact
    email_addr:             trim(app.email, 40),
    telephone:              digits(app.phoneHome, 15),
    mobile:                 digits(app.phoneMobile, 15),
    // Legacy columns that the form also writes
    phone:                  digits(app.phoneHome, 10),
    phone_mobile:           digits(app.phoneMobile, 10),

    // Relations
    contact:                trim(app.contactName, 35),
    contact_relation:       trim(app.contactRelation, 20),
    contact_addr1:          trim(app.contactAddress1 || app.contactAddress, 30),
    contact_addr2:          trim(app.contactAddress2, 30),
    contact_phone:          digits(app.contactPhone, 10),
    contact_mobile:         digits(app.contactMobile, 10),
    contact_email:          trim(app.contactEmail, 40),
    father_name:            trim(fatherName, 35),
    mother_name:            trim(motherName, 35),
    spouse_name:            trim(spouseName, 35),
    spouse_addr1:           trim((app as any).spouseAddressLine1 || (app as any).spouseAddress1, 30),
    spouse_addr2:           trim((app as any).spouseAddressLine2 || (app as any).spouseAddress2, 30),
    spouse_ssn:             trim(app.spouseSSN, 6),
    spouse_dob:             safeDate((app.spouseDOB || app.spouseDateOfBirth) ?? undefined),
    witness_name:           trim(app.witnessName, 35),
    date_witnessed:         safeDate(app.witnessDate ?? undefined),
    beneficiary:            trim(app.beneficiaryName, 35),
    ben_addr1:              trim(app.beneficiaryAddress, 30),
    ben_addr2:              trim(app.beneficiaryAddress1, 30),

    // Employment
    primary_occup:          trim((app.occupationCode || app.occupation || ''), 4) || null,
    work_permit:            app.hasWorkPermit ? 'Y' : 'N',
    work_permit_expiration: safeDate(app.workPermitExpiry ?? undefined),
    npf:                    npf,
    citizenship_flag:       citizenshipFlag,
    citizenship:            citizenshipFlag, // legacy column
    ip_signature:           'N',
    application_date:       new Date().toISOString().split('T')[0],
    date_of_residency:      safeDate(app.residencyDate ?? undefined),
    place_of_residence:     trim(app.placeOfResidency, 30),
    employer_name:          trim(app.employerName, 50),
    employer_address:       trim(app.employerAddress, 200),
    employer_phone:         digits(app.employerPhone, 10),
    employer_town:          trim(app.employerTown, 50),

    // Audit — use userCode for text fields, userId (UUID) for UUID fields
    entered_by:             userCode.slice(0, 5) || null,
    created_by:             userId || null,
    updated_by:             userId || null,
    created_at:             new Date().toISOString(),
    updated_at:             new Date().toISOString(),
  };
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
    sourceRoute,
  }: ConversionParams): Promise<ConversionResult> => {
    setIsConverting(true);
    setConversionErrors([]);

    try {
      // ── Step 1: Client-side preflight validation ──────────────────────────
      const preflightErrors = validateApplicationForConversion(applicationDetail);
      if (preflightErrors.length > 0) {
        setConversionErrors(preflightErrors);
        return {
          success: false,
          errors: preflightErrors,
          message: `Validation failed: ${preflightErrors[0].message}`,
        };
      }

      // ── Step 2: Generate application_id (same as IPRegistrationForm new mode) ──
      const { data: applicationId, error: appIdError } = await supabase.rpc('generate_application_id');
      if (appIdError) throw new Error(`Failed to generate application ID: ${appIdError.message}`);

      // ── Step 3: Generate temp SSN (same as IPRegistrationForm saveToDatabase) ──
      const { data: tempSsn, error: ssnError } = await supabase.rpc('generate_temp_ssn');
      if (ssnError) throw new Error(`Failed to generate temp SSN: ${ssnError.message}`);

      const uniqueUuid = crypto.randomUUID();

      // ── Step 4: Build insert payload using same schema as IPRegistrationForm ──
      const insertPayload = buildIPMasterInsert(
        applicationDetail,
        uniqueUuid,
        applicationId,
        tempSsn,
        userId,
        userCode
      );

      // ── Step 5: Insert draft record into ip_master ─────────────────────────
      const { data: insertedRecord, error: insertError } = await supabase
        .from('ip_master')
        .insert(insertPayload as any)
        .select('id, unique_uuid, application_id, ssn')
        .single();

      if (insertError) {
        throw new Error(`Failed to create IP record: ${insertError.message}${insertError.details ? ` | ${insertError.details}` : ''}`);
      }

      // ── Step 6: Submit via submit_ip_registration RPC ─────────────────────
      //    This generates the permanent SSN and moves status Z → P
      //    and triggers workflow — same as when user clicks "Submit" in the form
      const { data: submitResult, error: submitError } = await supabase.rpc(
        'submit_ip_registration',
        { p_unique_uuid: uniqueUuid }
      );

      if (submitError) {
        // Clean up the draft if submit fails
        await supabase.from('ip_master').delete().eq('unique_uuid', uniqueUuid);
        throw new Error(`Submission failed: ${submitError.message}`);
      }

      const finalSsn = (submitResult as any)?.ssn as string;
      if (!finalSsn) {
        await supabase.from('ip_master').delete().eq('unique_uuid', uniqueUuid);
        throw new Error('Submission succeeded but no SSN was returned');
      }

      // ── Step 7: Update submitted_by with userCode (text field, max 5 chars) ──
      //    submit_ip_registration sets submitted_by = auth.uid() (UUID).
      //    We need to overwrite with the 5-char userCode per audit policy.
      await supabase
        .from('ip_master')
        .update({ submitted_by: userId } as any) // keep UUID in submitted_by (it's a UUID col)
        .eq('unique_uuid', uniqueUuid);

      // ── Step 8: Insert dependants directly into ip_depend ─────────────────
      //    Mirrors addDependent() in useIPRegistration.ts exactly
      const dependants = applicationDetail.dependants || [];
      let dependantsAdded = 0;
      let dependantsSkipped = 0;

      for (const dep of dependants) {
        try {
          const { data: nextIdData } = await supabase.rpc('generate_depend_id', { p_ssn: finalSsn });
          const dependId = nextIdData || '000001';

          // Resolve relation code: only store if it exists in tb_relation, else null
          const relationCode = dep.relationship?.trim() || null;
          const resolvedRelation = relationCode && validRelationCodes.has(relationCode.toUpperCase())
            ? relationCode.toUpperCase().slice(0, 3)
            : null;

          const depPayload = {
            ssn:          finalSsn,
            depend_id:    dependId,
            depend_ssn:   trim(dep.ssn, 6),
            surname:      trim(dep.lastName, 25),
            firstname:    trim(dep.firstName, 25),
            middle_name:  trim(dep.middleName, 25),
            dob:          safeDate(dep.dateOfBirth) || null,
            sex:          mapGender(dep.gender),
            relation:     resolvedRelation,
            depend_addr1: trim(dep.address, 50),
            depend_addr2: trim((dep as any).address1 ?? null, 50),
            school_child: dep.isInSchool || dep.isSchoolChild ? 'Y' : 'N',
            invalid:      dep.isInvalid ? 'Y' : 'N',
            status:       'P',
            userid:       userCode.slice(0, 5) || null,
            tran_code:    'ADD',
            date_modified: new Date().toISOString(),
          };

          const { error: depError } = await supabase
            .from('ip_depend')
            .insert(depPayload as any);

          if (depError) {
            console.warn(`Dependant ${dep.firstName} ${dep.lastName} skipped: ${depError.message}`);
            dependantsSkipped++;
          } else {
            dependantsAdded++;
          }
        } catch (depErr) {
          console.warn('Dependant insert error:', depErr);
          dependantsSkipped++;
        }
      }

      // ── Step 9: Log audit entry ───────────────────────────────────────────
      try {
        await supabase.from('ip_audit_log').insert({
          table_name: 'ip_master',
          record_id: insertedRecord.id,
          unique_uuid: uniqueUuid,
          action: 'CONVERT',
          changed_by: userId,
          old_value: applicationDetail.referenceNumber,
          new_value: finalSsn,
          field_name: 'status',
        } as any);
      } catch {
        // Audit log failure is non-critical
      }

      // ── Step 10: Invalidate relevant caches ──────────────────────────────
      queryClient.invalidateQueries({ queryKey: ['ip-records'] });
      queryClient.invalidateQueries({ queryKey: ['ip_master'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });

      const successMsg = `IP Registration created successfully. SSN: ${finalSsn}` +
        (dependantsSkipped > 0 ? ` (${dependantsAdded} dependants added, ${dependantsSkipped} skipped)` : dependantsAdded > 0 ? ` (${dependantsAdded} dependants added)` : '');

      return {
        success: true,
        ssn: finalSsn,
        unique_uuid: uniqueUuid,
        application_id: applicationId,
        dependants_added: dependantsAdded,
        dependants_skipped: dependantsSkipped,
        message: successMsg,
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useConvertToIPRegistration]', message);
      return { success: false, message };
    } finally {
      setIsConverting(false);
    }
  }, [queryClient]);

  return { convert, isConverting, conversionErrors, setConversionErrors };
}
