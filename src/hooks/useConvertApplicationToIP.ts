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
  // Concatenate phone with dial code
  const phone = [detail.phoneHomeDialCode, detail.phoneHome].filter(Boolean).join('');
  const phoneMobile = [detail.phoneMobileDialCode, detail.phoneMobile].filter(Boolean).join('');
  const contactPhone = [detail.contactPhoneDialCode, detail.contactPhone].filter(Boolean).join('');
  const contactMobile = [detail.contactMobileDialCode, detail.contactMobile].filter(Boolean).join('');

  // Build father/mother full name
  const fatherName = [detail.fatherFirstName, detail.fatherLastName].filter(Boolean).join(' ');
  const motherName = [detail.motherFirstName, detail.motherLastName].filter(Boolean).join(' ');
  const spouseName = [detail.spouseFirstName, detail.spouseLastName].filter(Boolean).join(' ');

  // Split beneficiary address at midpoint or first comma
  const benAddr = detail.beneficiaryAddress || '';
  const commaIdx = benAddr.indexOf(',');
  const benAddr1 = commaIdx > 0 ? benAddr.substring(0, commaIdx).trim() : benAddr;
  const benAddr2 = commaIdx > 0 ? benAddr.substring(commaIdx + 1).trim() : '';

  // Split contact address similarly
  const cAddr = detail.contactAddress || '';
  const cComma = cAddr.indexOf(',');
  const contactAddr1 = cComma > 0 ? cAddr.substring(0, cComma).trim() : cAddr;
  const contactAddr2 = cComma > 0 ? cAddr.substring(cComma + 1).trim() : '';

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

  return {
    p_reference_number: detail.referenceNumber,
    p_title: detail.title || null,
    p_first_name: detail.firstName || null,
    p_middle_name: detail.middleName || null,
    p_last_name: detail.lastName || null,
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
    p_address_line1: detail.addressLine1 || null,
    p_address_line2: detail.addressLine2 || null,
    p_postal_district: detail.postalDistrict || null,
    p_mailing_addr1: detail.mailingAddr1 || null,
    p_mailing_addr2: detail.mailingAddr2 || null,
    p_phone: phone || null,
    p_phone_mobile: phoneMobile || null,
    p_email: detail.email || null,
    p_contact_name: detail.contactName || null,
    p_contact_relation: detail.contactRelation || null,
    p_contact_addr1: contactAddr1 || null,
    p_contact_addr2: contactAddr2 || null,
    p_contact_email: detail.contactEmail || null,
    p_contact_phone: contactPhone || null,
    p_contact_mobile: contactMobile || null,
    p_father_name: fatherName || null,
    p_mother_name: motherName || null,
    p_spouse_name: spouseName || null,
    p_spouse_ssn: detail.spouseSSN || null,
    p_spouse_dob: detail.spouseDOB || null,
    p_beneficiary_name: detail.beneficiaryName || null,
    p_ben_addr1: benAddr1 || null,
    p_ben_addr2: benAddr2 || null,
    p_occupation: detail.occupation || null,
    p_citizenship: detail.placeOfResidency || null,
    p_date_of_residency: detail.residencyDate || null,
    p_has_work_permit: detail.hasWorkPermit ? 'Y' : 'N',
    p_work_permit_expiry: detail.workPermitExpiry || null,
    p_witness_name: detail.witnessName || null,
    p_witness_date: detail.witnessDate || null,
    p_application_date: detail.submittedAt ? detail.submittedAt.substring(0, 10) : null,
    p_remarks: detail.remarks || null,
    p_approved_by: approvedBy,
    p_source_route: sourceRoute,
    p_dependants: dependants,
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
