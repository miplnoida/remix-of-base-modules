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

/**
 * Maps an ExternalApplicationDetail to the RPC parameters and calls convert_application_to_ip
 */
function buildRpcParams(detail: ExternalApplicationDetail, approvedBy: string, sourceRoute: string) {
  // Phone digits only (no dial codes for db storage)
  const phone = detail.phoneHome || null;
  const phoneMobile = detail.phoneMobile || null;
  const contactPhone = detail.contactPhone || null;
  const contactMobile = detail.contactMobile || null;

  // Parent names: use single-string field first, fall back to first+last concatenation
  const fatherName = detail.fatherName || [detail.fatherFirstName, detail.fatherLastName].filter(Boolean).join(' ');
  const motherName = detail.motherName || [detail.motherFirstName, detail.motherLastName].filter(Boolean).join(' ');
  // Spouse: use spouseFirstName per mapping (spouse_name ← spouse_first_name)
  const spouseName = detail.spouseName || [detail.spouseFirstName, detail.spouseLastName].filter(Boolean).join(' ');

  // Contact address: contactAddress → contact_addr1, contactAddress1 → contact_addr2
  const contactAddr1 = detail.contactAddress || '';
  const contactAddr2 = detail.contactAddress1 || '';

  // Beneficiary address
  const benAddr1 = detail.beneficiaryAddress || '';
  const benAddr2 = detail.beneficiaryAddress1 || '';

  // Spouse address (from ExternalApplicationDetail)
  const spouseAddr1 = (detail as any).spouseAddressLine1 || '';
  const spouseAddr2 = (detail as any).spouseAddressLine2 || '';

  // Map dependants
  const dependants = (detail.dependants || []).map(dep => ({
    firstName: dep.firstName,
    lastName: dep.lastName,
    dateOfBirth: dep.dateOfBirth,
    gender: dep.gender,
    relationship: dep.relationship,
    address: dep.address,
    isInSchool: dep.isInSchool,
  }));

  // Resolve NPF from npfMember (boolean) or npf (string)
  const npfRaw = (detail as any).npfMember;
  let npfValue: string | null = null;
  if (npfRaw === true || npfRaw === 'true' || npfRaw === 'Y' || npfRaw === 'Yes') npfValue = 'Y';
  else if (npfRaw === false || npfRaw === 'false' || npfRaw === 'N' || npfRaw === 'No') npfValue = 'N';
  else if (detail.npf) npfValue = detail.npf === 'Y' || detail.npf === 'N' ? detail.npf : null;

  // Resolve Citizenship from isCitizen (boolean) or citizenship (string)
  const citRaw = (detail as any).isCitizen;
  let citizenshipValue: string | null = null;
  if (citRaw === true || citRaw === 'true' || citRaw === 'Y' || citRaw === 'Yes') citizenshipValue = 'Y';
  else if (citRaw === false || citRaw === 'false' || citRaw === 'N' || citRaw === 'No') citizenshipValue = 'N';
  else if (detail.citizenship) citizenshipValue = detail.citizenship === 'Y' || detail.citizenship === 'N' ? detail.citizenship : null;

  return {
    p_reference_number: detail.referenceNumber,
    p_title: detail.title || null,
    p_first_name: detail.firstName || null,
    p_middle_name: detail.middleName || null,
    p_last_name: detail.lastName || null,
    p_second_middle_name: detail.middleName1 || null,
    p_suffix: detail.suffix || null,
    p_maiden_name: detail.maidenName || null,
    p_alias: detail.alias || null,
    p_gender: detail.gender || null,
    p_date_of_birth: detail.dateOfBirth || null,
    p_height_feet: detail.heightFeet ?? null,
    p_height_inches: detail.heightInches ?? null,
    p_eye_color: detail.eyeColor || null,
    p_birth_place: detail.placeOfBirth || null,
    p_nationality: detail.nationality || null,
    p_marital_status: detail.maritalStatus || null,
    p_date_married: detail.dateMarried || null,
    p_photo_url: detail.photoUrl || null,
    p_address_line1: detail.resAddr1 || detail.addressLine1 || null,
    p_address_line2: detail.resAddr2 || detail.addressLine2 || null,
    p_postal_district: detail.resDistrict || detail.postalDistrict || null,
    p_mailing_addr1: detail.mailingAddr1 || null,
    p_mailing_addr2: detail.mailingAddr2 || null,
    p_phone: phone,
    p_phone_mobile: phoneMobile,
    p_email: detail.email || null,
    p_contact_name: detail.contactName || null,
    p_contact_relation: detail.contactRelation || null,
    p_contact_addr1: contactAddr1 || null,
    p_contact_addr2: contactAddr2 || null,
    p_contact_email: detail.contactEmail || null,
    p_contact_phone: contactPhone,
    p_contact_mobile: contactMobile,
    p_father_name: fatherName || null,
    p_mother_name: motherName || null,
    p_spouse_name: spouseName || null,
    p_spouse_addr1: spouseAddr1 || null,
    p_spouse_addr2: spouseAddr2 || null,
    p_spouse_ssn: detail.spouseSSN || null,
    p_spouse_dob: detail.spouseDOB || detail.spouseDateOfBirth || null,
    p_beneficiary_name: detail.beneficiaryName || null,
    p_ben_addr1: benAddr1 || null,
    p_ben_addr2: benAddr2 || null,
    p_occupation: detail.occupation || null,
    p_citizenship: citizenshipValue,
    p_npf: npfValue,
    p_date_of_residency: detail.residencyDate || null,
    p_has_work_permit: detail.hasWorkPermit ? 'Y' : 'N',
    p_work_permit_expiry: detail.workPermitExpiry || null,
    p_witness_name: detail.witnessName || null,
    p_witness_date: detail.witnessDate || null,
    p_application_date: detail.employmentStartDate || null,
    p_remarks: detail.remarks || null,
    p_approved_by: approvedBy,
    p_source_route: sourceRoute,
    p_dependants: dependants,
    p_employer_name: detail.employerName || null,
    p_employer_address: detail.employerAddress || null,
    p_employer_phone: detail.employerPhone || null,
    p_employer_town: detail.employerTown || null,
    p_submitted_by: null,
    p_submitted_at: detail.submittedAt || null,
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

      const { data, error } = await supabase.rpc('convert_application_to_ip', params as any);

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
      toast.success(result.message || 'Application converted to IP record successfully');
    },
    onError: (error: Error) => {
      console.error('Application conversion error:', error);
      if (error.message.includes('DUPLICATE_CONVERSION')) {
        toast.error('This application has already been converted to an IP record.');
      } else {
        toast.error(`Conversion failed: ${error.message}`);
      }
    },
  });
}
