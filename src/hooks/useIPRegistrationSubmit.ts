import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { triggerIPRegistrationWorkflow } from '@/services/workflowTriggerService';

const formatDbError = (err: unknown): string => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;

  const anyErr = err as any;
  const message = anyErr?.message || anyErr?.error_description || anyErr?.msg;
  const details = anyErr?.details;
  const hint = anyErr?.hint;
  const code = anyErr?.code;

  return [
    message,
    details ? `Details: ${details}` : null,
    hint ? `Hint: ${hint}` : null,
    code ? `Code: ${code}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
};

export interface IPSubmitData {
  unique_uuid: string;
  application_id?: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  marital_status?: string | null;
  date_married?: string | null;
  nationality?: string | null;
  birth_place?: string | null;
  title?: string | null;
  citizenship?: string | null;
  place_of_residence?: string | null;
  work_permit_status?: string | null;
  work_permit_expiry?: string | null;
  birth_doc_type?: string | null;
  name_doc_type?: string | null;
  status?: string;
  id?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface SubmitResult {
  success: boolean;
  ssn?: string;
  errors?: ValidationErrors;
  message?: string;
  workflowInstanceId?: string;
}

/**
 * Validates all required fields for IP Registration submission.
 * This is the SINGLE SOURCE OF TRUTH for submission validation.
 */
export const validateIPRegistrationForSubmit = (data: IPSubmitData): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Basic Details validation
  if (!data.first_name?.trim()) errors.first_name = 'First name is required';
  if (!data.last_name?.trim()) errors.last_name = 'Last name is required';
  if (!data.gender) errors.gender = 'Gender is required';
  if (!data.date_of_birth) errors.date_of_birth = 'Date of birth is required';
  if (!data.marital_status) errors.marital_status = 'Marital status is required';
  if (!data.nationality) errors.nationality = 'Nationality is required';
  if (!data.birth_place) errors.birth_place = 'Birth place is required';
  if (!data.title) errors.title = 'Title is required';

  // Marital status validation
  if ((data.marital_status === 'Married' || data.marital_status === 'Common Law') && !data.date_married) {
    errors.date_married = 'Date married is required';
  }
  if (data.date_married && data.date_of_birth) {
    if (new Date(data.date_married) <= new Date(data.date_of_birth)) {
      errors.date_married = 'Date married must be after date of birth';
    }
  }

  // Employment validation for non-citizens
  if (data.citizenship === 'N' && data.place_of_residence === 'RES') {
    if (!data.work_permit_status || data.work_permit_status === 'N') {
      errors.work_permit_status = 'Work permit is required for non-citizen residents';
    }
    if (!data.work_permit_expiry) {
      errors.work_permit_expiry = 'Work permit expiry is required';
    }
  }

  // Document verification
  if (!data.birth_doc_type) errors.birth_doc_type = 'Birth status verification is required';
  if (!data.name_doc_type) errors.name_doc_type = 'Name status verification is required';

  return errors;
};

/**
 * Hook providing unified IP Registration submission functionality.
 * This is the SINGLE SOURCE OF TRUTH for submitting IP registrations.
 * Both List screen and Edit screen MUST use this hook.
 */
export function useIPRegistrationSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInProgressRef = useRef(false);

  /**
   * Fetches the complete record data from ip_master for validation.
   */
  const fetchRecordData = async (uniqueUuid: string): Promise<IPSubmitData | null> => {
    const { data, error } = await supabase
      .from('ip_master')
      .select('unique_uuid, application_id, firstname, middle_name, surname, sex, dob, marital_status, date_married, nationality, birth_place, name_prefix, citizenship, place_of_residence, work_permit, work_permit_expiration, birth_doc_type, name_doc_type, status, id')
      .eq('unique_uuid', uniqueUuid)
      .single();

    if (error) {
      console.error('Error fetching record:', error);
      throw new Error(formatDbError(error));
    }

    return data as IPSubmitData;
  };

  /**
   * Main submit function - the SINGLE SOURCE OF TRUTH for IP Registration submission.
   */
  const submitIPRegistration = useCallback(async (
    uniqueUuid: string,
    userId?: string,
    unsavedData?: Partial<IPSubmitData>
  ): Promise<SubmitResult> => {
    // Prevent duplicate submissions
    if (submissionInProgressRef.current) {
      return { success: false, message: 'Submission already in progress' };
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);

    try {
      // Step 1: If there's unsaved data, save it first
      if (unsavedData && Object.keys(unsavedData).length > 0) {
        const updateData: Record<string, unknown> = {
          ...unsavedData,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        };
        delete updateData.unique_uuid;
        delete updateData.id;
        
        const { error: saveError } = await supabase
          .from('ip_master')
          .update(updateData)
          .eq('unique_uuid', uniqueUuid);

        if (saveError) {
          throw new Error(`Failed to save draft data before submission: ${formatDbError(saveError)}`);
        }
      }

      // Step 2: Fetch the complete record for validation
      const recordData = await fetchRecordData(uniqueUuid);
      if (!recordData) {
        throw new Error('Record not found');
      }

      // Verify record is in draft status
      if (recordData.status !== 'Z') {
        throw new Error('Only draft records can be submitted');
      }

      // Step 3: Validate all fields
      const validationErrors = validateIPRegistrationForSubmit(recordData);
      if (Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0];
        return {
          success: false,
          errors: validationErrors,
          message: firstError,
        };
      }

      // Step 4: Atomic backend submit (SSN generation + status update)
      const { data: submitData, error: submitError } = await supabase.rpc('submit_ip_registration', {
        p_unique_uuid: uniqueUuid,
      });

      if (submitError) {
        throw new Error(formatDbError(submitError));
      }

      const ssnData = (submitData as any)?.ssn as string | undefined;
      if (!ssnData) {
        throw new Error('Submission succeeded but SSN was not returned');
      }

      // Step 6: Trigger workflow (if configured) — uses shared service
      const recordName = `${recordData.first_name || ''} ${recordData.last_name || ''}`.trim();
      const workflowInstanceId = await triggerIPRegistrationWorkflow({
        uniqueUuid,
        ssn: ssnData,
        recordName,
        userId,
      });

      // Step 7: Log audit entry
      if (recordData.id) {
        await supabase.from('ip_audit_log').insert({
          table_name: 'ip_master',
          record_id: recordData.id,
          unique_uuid: uniqueUuid,
          action: 'SUBMIT',
          changed_by: userId,
          old_value: 'Z',
          new_value: 'P',
          field_name: 'status',
        });
      }

      return {
        success: true,
        ssn: ssnData,
        workflowInstanceId: workflowInstanceId || undefined,
        message: `Registration submitted successfully. SSN: ${ssnData}`,
      };
    } catch (error) {
      console.error('Submit error:', error);
      return {
        success: false,
        message: formatDbError(error),
      };
    } finally {
      setIsSubmitting(false);
      submissionInProgressRef.current = false;
    }
  }, []);

  return {
    submitIPRegistration,
    isSubmitting,
    validateIPRegistrationForSubmit,
  };
}
