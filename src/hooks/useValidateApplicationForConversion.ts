import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalApplicationDetail } from '@/types/externalApplication';

export interface ConversionValidationError {
  field: string;
  type: 'MISSING' | 'LENGTH' | 'INVALID' | 'DUPLICATE' | 'SYSTEM_ERROR';
  message: string;
}

export interface ConversionValidationResult {
  valid: boolean;
  already_converted: boolean;
  errors: ConversionValidationError[];
  warnings: ConversionValidationError[];
  error_count: number;
  warning_count: number;
  server_time?: string;
}

function buildValidationParams(app: ExternalApplicationDetail) {
  const fatherName = app.fatherName || [app.fatherFirstName, app.fatherLastName].filter(Boolean).join(' ') || null;
  const motherName = app.motherName || [app.motherFirstName, app.motherLastName].filter(Boolean).join(' ') || null;
  const spouseName = app.spouseName || [app.spouseFirstName, app.spouseLastName].filter(Boolean).join(' ') || null;

  return {
    p_reference_number:    app.referenceNumber,
    p_first_name:          app.firstName         || null,
    p_last_name:           app.lastName          || null,
    p_middle_name:         (app.middleName1 || app.middleName || '').trim() || null,
    p_second_middle_name:  (app.middleName2 || '').trim() || null,
    p_title:               app.title             || null,
    p_suffix:              app.suffix            || null,
    p_maiden_name:         app.maidenName        || null,
    p_alias:               app.alias             || null,
    p_gender:              app.gender            || null,
    p_date_of_birth:       app.dateOfBirth       || null,
    p_nationality:         app.nationality       || null,
    p_marital_status:      app.maritalStatus     || null,
    p_birth_place:         app.placeOfBirth      || null,
    p_eye_color:           app.eyeColor          || null,
    p_address_line1:       app.resAddr1 || app.addressLine1 || null,
    p_address_line2:       app.resAddr2 || app.addressLine2 || null,
    p_postal_district:     app.resDistrict || app.postalDistrict || null,
    p_mailing_addr1:       app.mailingAddr1      || null,
    p_mailing_addr2:       app.mailingAddr2      || null,
    p_email:               app.email             || null,
    p_phone:               app.phoneHome         || null,
    p_phone_mobile:        app.phoneMobile       || null,
    p_contact_name:        app.contactName       || null,
    p_contact_relation:    app.contactRelation   || null,
    p_contact_addr1:       app.contactAddress    || null,
    p_contact_addr2:       app.contactAddress1   || null,
    p_contact_email:       app.contactEmail      || null,
    p_contact_phone:       app.contactPhone      || null,
    p_contact_mobile:      app.contactMobile     || null,
    p_father_name:         fatherName,
    p_mother_name:         motherName,
    p_spouse_name:         spouseName,
    p_spouse_addr1:        (app as any).spouseAddressLine1 || null,
    p_spouse_addr2:        (app as any).spouseAddressLine2 || null,
    p_spouse_ssn:          app.spouseSSN         || null,
    p_spouse_dob:          app.spouseDOB || app.spouseDateOfBirth || null,
    p_beneficiary_name:    app.beneficiaryName   || null,
    p_ben_addr1:           app.beneficiaryAddress || null,
    p_ben_addr2:           app.beneficiaryAddress1 || null,
    p_witness_name:        app.witnessName       || null,
    p_occupation:          app.occupationCode || app.occupation || null,
    p_employer_name:       app.employerName      || null,
    p_employer_address:    app.employerAddress   || null,
    p_employer_phone:      app.employerPhone     || null,
    p_employer_town:       app.employerTown      || null,
    p_remarks:             app.remarks           || null,
    p_dependants:          (app.dependants || []).map(dep => ({
      firstName:    dep.firstName  || '',
      lastName:     dep.lastName   || '',
      dateOfBirth:  dep.dateOfBirth || null,
      gender:       dep.gender     || null,
      relationship: dep.relationship || '',
      address:      dep.address    || '',
      isInSchool:   dep.isInSchool ?? dep.isSchoolChild ?? false,
      ssn:          dep.ssn        || null,
    })),
  };
}

export function useValidateApplicationForConversion(
  referenceNumber: string | undefined,
  application: ExternalApplicationDetail | null | undefined
) {
  return useQuery({
    queryKey: ['validate-conversion', referenceNumber],
    queryFn: async (): Promise<ConversionValidationResult> => {
      if (!application || !referenceNumber) {
        return { valid: true, already_converted: false, errors: [], warnings: [], error_count: 0, warning_count: 0 };
      }

      const params = buildValidationParams(application);
      const { data, error } = await supabase.rpc('validate_application_for_conversion', params as any);

      if (error) throw new Error(error.message);
      return data as unknown as ConversionValidationResult;
    },
    enabled: !!referenceNumber && !!application,
    staleTime: 30 * 1000,
    retry: 1,
  });
}
