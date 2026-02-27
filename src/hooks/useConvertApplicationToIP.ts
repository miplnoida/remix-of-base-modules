import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExternalApplicationDetail } from '@/types/externalApplication';

interface ConversionParams {
  applicationDetail: ExternalApplicationDetail;
  approvedBy: string; // auth UUID
  sourceRoute: string;
}

interface ConversionResult {
  success: boolean;
  ip_master_id?: string;
  application_id?: string;
  dependants_converted?: number;
  message?: string;
  error?: string;
}

/** Strip a phone string to digits only, truncated to maxLen (default 10 for db columns) */
function digitsOnly(value: string | null | undefined, maxLen = 10): string | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits.slice(0, maxLen) : null;
}

/** Safely resolve a Y/N flag from boolean | string | null */
function toYN(raw: boolean | string | null | undefined, fallback: 'Y' | 'N' = 'N'): string {
  if (raw === true  || raw === 'true'  || raw === 'Y' || raw === 'Yes') return 'Y';
  if (raw === false || raw === 'false' || raw === 'N' || raw === 'No')  return 'N';
  return fallback;
}

/** Ensure a nationality/birth_place code is max 3 chars; fallback to null so DB defaults 'UNK' */
function countryCode(val: string | null | undefined): string | null {
  if (!val || val.trim() === '') return null;
  return val.trim().slice(0, 3).toUpperCase();
}

/** Safely parse a date string — returns null if invalid */
function safeDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

/**
 * Maps an ExternalApplicationDetail to the RPC parameters and calls convert_application_to_ip
 */
function buildRpcParams(detail: ExternalApplicationDetail, approvedBy: string, sourceRoute: string) {
  // Phone digits only — db columns phone/phone_mobile are varchar(10)
  const phone        = digitsOnly(detail.phoneHome);
  const phoneMobile  = digitsOnly(detail.phoneMobile);
  const contactPhone = digitsOnly(detail.contactPhone);
  const contactMobile = digitsOnly(detail.contactMobile);

  // Parent names: use single-string field first, fall back to first+last concatenation
  const fatherName = detail.fatherName || [detail.fatherFirstName, detail.fatherLastName].filter(Boolean).join(' ') || null;
  const motherName = detail.motherName || [detail.motherFirstName, detail.motherLastName].filter(Boolean).join(' ') || null;
  const spouseName = detail.spouseName || [detail.spouseFirstName, detail.spouseLastName].filter(Boolean).join(' ') || null;

  // Contact address
  const contactAddr1 = detail.contactAddress || null;
  const contactAddr2 = detail.contactAddress1 || null;

  // Beneficiary address
  const benAddr1 = detail.beneficiaryAddress || null;
  const benAddr2 = detail.beneficiaryAddress1 || null;

  // Spouse address
  const spouseAddr1 = (detail as any).spouseAddressLine1 || (detail as any).spouseAddress1 || null;
  const spouseAddr2 = (detail as any).spouseAddressLine2 || (detail as any).spouseAddress2 || null;

  // Map dependants — guard every field against null/undefined
  const dependants = (detail.dependants || []).map(dep => ({
    firstName:    dep.firstName  || '',
    lastName:     dep.lastName   || '',
    dateOfBirth:  safeDate(dep.dateOfBirth),
    gender:       dep.gender     || null,
    relationship: dep.relationship || '',
    address:      dep.address    || '',
    isInSchool:   dep.isInSchool ?? dep.isSchoolChild ?? false,
    ssn:          dep.ssn        || null,
  }));

  // Resolve NPF (boolean | string | null → 'Y'/'N')
  const npfValue = toYN((detail as any).npfMember ?? detail.npf, 'N');

  // Resolve Citizenship (boolean | string | null → 'Y'/'N')
  const citizenshipValue = toYN((detail as any).isCitizen ?? detail.citizenship, 'N');

  // Employer phone — digits only, max 10
  const employerPhone = digitsOnly(detail.employerPhone);

  return {
    p_reference_number:   detail.referenceNumber,
    p_title:              detail.title             || null,
    p_first_name:         detail.firstName         || null,
    p_middle_name:        (detail.middleName1 || detail.middleName || '').trim() || null,
    p_last_name:          detail.lastName          || null,
    p_second_middle_name: (detail.middleName2 || '').trim() || null,
    p_suffix:             detail.suffix            || null,
    p_maiden_name:        detail.maidenName        || null,
    p_alias:              detail.alias             || null,
    p_gender:             detail.gender            || null,
    p_date_of_birth:      safeDate(detail.dateOfBirth),
    p_height_feet:        detail.heightFeet        ?? null,
    p_height_inches:      detail.heightInches      ?? null,
    p_eye_color:          detail.eyeColor          || null,
    p_birth_place:        countryCode(detail.placeOfBirth),
    p_nationality:        countryCode(detail.nationality),
    p_marital_status:     detail.maritalStatus     || null,
    p_date_married:       safeDate(detail.dateMarried ?? undefined),
    p_photo_url:          detail.photoUrl          || null,
    p_address_line1:      detail.resAddr1  || detail.addressLine1 || null,
    p_address_line2:      detail.resAddr2  || detail.addressLine2 || null,
    p_postal_district:    countryCode(detail.resDistrict || detail.postalDistrict),
    p_mailing_addr1:      detail.mailingAddr1      || null,
    p_mailing_addr2:      detail.mailingAddr2      || null,
    p_phone:              phone,
    p_phone_mobile:       phoneMobile,
    p_email:              detail.email             || null,
    p_contact_name:       detail.contactName       || null,
    p_contact_relation:   detail.contactRelation   || null,
    p_contact_addr1:      contactAddr1,
    p_contact_addr2:      contactAddr2,
    p_contact_email:      detail.contactEmail      || null,
    p_contact_phone:      contactPhone,
    p_contact_mobile:     contactMobile,
    p_father_name:        fatherName,
    p_mother_name:        motherName,
    p_spouse_name:        spouseName,
    p_spouse_addr1:       spouseAddr1,
    p_spouse_addr2:       spouseAddr2,
    p_spouse_ssn:         detail.spouseSSN         || null,
    p_spouse_dob:         safeDate(detail.spouseDOB || detail.spouseDateOfBirth || undefined),
    p_beneficiary_name:   detail.beneficiaryName   || null,
    p_ben_addr1:          benAddr1,
    p_ben_addr2:          benAddr2,
    p_occupation:         (detail.occupationCode   || detail.occupation || '').slice(0, 4) || null,
    p_citizenship:        citizenshipValue,
    p_npf:                npfValue,
    p_date_of_residency:  (detail.placeOfBirth && detail.placeOfResidency && detail.placeOfBirth === detail.placeOfResidency) ? null : safeDate(detail.residencyDate ?? undefined),
    p_has_work_permit:    ((detail as any).hasWorkPermit === true || (detail as any).hasWorkPermit === 'Y' || (detail as any).hasWorkPermit === 'true') ? 'Y' : 'N',
    p_work_permit_expiry: safeDate(detail.workPermitExpiry ?? undefined),
    p_witness_name:       detail.witnessName       || null,
    p_witness_date:       safeDate(detail.witnessDate ?? undefined),
    p_application_date:   safeDate(detail.employmentStartDate ?? undefined),
    p_remarks:            detail.remarks           || null,
    p_approved_by:        approvedBy               || null,
    p_source_route:       sourceRoute,
    p_dependants:         dependants,
    p_employer_name:      detail.employerName      || null,
    p_employer_address:   detail.employerAddress   || null,
    p_employer_phone:     employerPhone,
    p_employer_town:      detail.employerTown      || null,
    p_submitted_by:       null,
    p_submitted_at:       detail.submittedAt       || null,
  };
}

/**
 * Hook to convert an approved online application into an ip_master record
 */
export function useConvertApplicationToIP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationDetail, approvedBy, sourceRoute }: ConversionParams): Promise<ConversionResult> => {
      const params = buildRpcParams(applicationDetail, approvedBy, sourceRoute);

      // Use direct fetch to bypass type checking for this custom RPC
      const { data, error } = await (supabase.rpc as any)('convert_application_to_ip', params);

      if (error) {
        throw new Error(error.message || 'Failed to convert application');
      }

      const result = data as unknown as ConversionResult;
      if (!result.success) {
        throw new Error(result.message || 'Conversion failed');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ip-records'] });
      queryClient.invalidateQueries({ queryKey: ['online-applications'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });

      const baseMsg = result.message || 'Application converted to IP record successfully';
      const depNote = (result as any).dependants_note;
      toast.success(baseMsg);
      if (depNote) {
        // Show a separate info toast about dependant staging
        setTimeout(() => toast.info(depNote), 600);
      }
    },
    onError: (error: Error) => {
      console.error('Application conversion error:', error);
      if (error.message.includes('DUPLICATE_CONVERSION')) {
        toast.error('This application has already been converted to an IP record.');
      } else if (error.message.includes('MISSING_FIELD')) {
        toast.error(`Validation failed: ${error.message}`);
      } else if (error.message.includes('INSERT_FAILED')) {
        toast.error(`Database error during conversion: ${error.message}`);
      } else {
        toast.error(`Conversion failed: ${error.message}`);
      }
    },
  });
}
