import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  IPMasterFormData, 
  IPDependentData, 
  IPNoteData,
  initialIPMasterFormData,
} from '@/types/ipRegistration';

interface UseIPRegistrationOptions {
  ssn?: string;
  mode: 'create' | 'edit' | 'view';
}

export const useIPRegistration = ({ ssn, mode }: UseIPRegistrationOptions) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<IPMasterFormData>(initialIPMasterFormData);
  const [dependents, setDependents] = useState<IPDependentData[]>([]);
  const [notes, setNotes] = useState<IPNoteData[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(mode === 'create');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessAnimation, setSaveSuccessAnimation] = useState(false);
  const [currentTab, setCurrentTab] = useState('basic');
  const [enabledTabs, setEnabledTabs] = useState<string[]>(['basic']);
  
  // Ref to prevent duplicate saves
  const isSavingRef = useRef(false);

  // Fetch existing IP record
  const { data: ipRecord, isLoading: isLoadingIP } = useQuery({
    queryKey: ['ip_master', ssn],
    queryFn: async () => {
      if (!ssn) return null;
      const { data, error } = await supabase
        .from('ip_master')
        .select('*')
        .eq('ssn', ssn)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ssn && mode !== 'create',
  });

  // Fetch dependents
  const { data: dependentsData, isLoading: isLoadingDependents } = useQuery({
    queryKey: ['ip_depend', ssn],
    queryFn: async () => {
      if (!ssn) return [];
      const { data, error } = await supabase
        .from('ip_depend')
        .select('*')
        .eq('ssn', ssn)
        .neq('status', 'D'); // Exclude soft-deleted
      if (error) throw error;
      return data;
    },
    enabled: !!ssn && mode !== 'create',
  });

  // Fetch notes
  const { data: notesData, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['ip_notes', ssn],
    queryFn: async () => {
      if (!ssn) return [];
      const { data, error } = await supabase
        .from('ip_notes')
        .select('*')
        .eq('ssn', ssn)
        .order('note_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ssn && mode !== 'create',
  });

  // Load data into state when fetched
  useEffect(() => {
    if (ipRecord) {
      const mappedData: IPMasterFormData = {
        ssn: ipRecord.ssn || '',
        surname: ipRecord.surname || ipRecord.last_name || '',
        firstname: ipRecord.firstname || ipRecord.first_name || '',
        middle_name: ipRecord.middle_name || '',
        previous_name: ipRecord.previous_name || ipRecord.maiden_name || '',
        alias: ipRecord.alias || '',
        sex: ipRecord.sex || ipRecord.gender || '',
        dob: ipRecord.dob || ipRecord.date_of_birth || '',
        birth_place_code: ipRecord.birth_place_code || ipRecord.birth_place || '',
        nationality_code: ipRecord.nationality_code || ipRecord.nationality || '',
        marital_status: ipRecord.marital_status || '',
        heightfeet: ipRecord.heightfeet || ipRecord.height_feet || null,
        heightinches: ipRecord.heightinches || ipRecord.height_inches || null,
        eyecolor: ipRecord.eyecolor || ipRecord.eye_color || '',
        name_prefix: ipRecord.name_prefix || ipRecord.title || '',
        name_suffix: ipRecord.name_suffix || ipRecord.suffix || '',
        resident_addr1: ipRecord.resident_addr1 || ipRecord.resident_address_1 || '',
        resident_addr2: ipRecord.resident_addr2 || ipRecord.resident_address_2 || '',
        district: ipRecord.district || ipRecord.postal_district || '',
        mail_addr1: ipRecord.mail_addr1 || '',
        mail_addr2: ipRecord.mail_addr2 || '',
        email_addr: ipRecord.email_addr || ipRecord.email || '',
        phone: ipRecord.phone || ipRecord.telephone || '',
        phone_mobile: ipRecord.phone_mobile || ipRecord.mobile || '',
        contact: ipRecord.contact || '',
        contact_relation: ipRecord.contact_relation || '',
        contact_addr1: ipRecord.contact_addr1 || '',
        contact_addr2: ipRecord.contact_addr2 || '',
        contact_phone: ipRecord.contact_phone || '',
        contact_mobile: ipRecord.contact_mobile || '',
        contact_email: ipRecord.contact_email || '',
        father_name: ipRecord.father_name || '',
        mother_name: ipRecord.mother_name || '',
        spouse_name: ipRecord.spouse_name || '',
        spouse_addr1: ipRecord.spouse_addr1 || '',
        spouse_addr2: ipRecord.spouse_addr2 || '',
        spouse_ssn: ipRecord.spouse_ssn || '',
        spouse_dob: ipRecord.spouse_dob || '',
        witness_name: ipRecord.witness_name || '',
        date_witnessed: ipRecord.date_witnessed || '',
        beneficiary: ipRecord.beneficiary || '',
        ben_addr1: ipRecord.ben_addr1 || '',
        ben_addr2: ipRecord.ben_addr2 || '',
        work_permit: ipRecord.work_permit || ipRecord.work_permit_status || 'N',
        primary_occup: ipRecord.primary_occup || ipRecord.occupation || '',
        npf: ipRecord.npf || ipRecord.npf_status || 'N',
        application_date: ipRecord.application_date || new Date().toISOString().split('T')[0],
        date_of_residency: ipRecord.date_of_residency || ipRecord.date_resident || '',
        place_of_residence_code: ipRecord.place_of_residence_code || ipRecord.place_of_residence || '',
        citizenship_flag: ipRecord.citizenship_flag || ipRecord.citizenship || 'N',
        ip_signature: ipRecord.ip_signature || ipRecord.signature_on_file || 'N',
        work_permit_expiration: ipRecord.work_permit_expiration || ipRecord.work_permit_expiry || '',
        verify_birth_code: ipRecord.verify_birth_code || '',
        verify_name_code: ipRecord.verify_name_code || '',
        verify_marital_code: ipRecord.verify_marital_code || '',
        verify_death_code: ipRecord.verify_death_code || '',
        date_verified: ipRecord.date_verified || '',
        verified_by: ipRecord.verified_by || '',
        status: ipRecord.status || 'Z',
        date_of_entry: ipRecord.date_of_entry || new Date().toISOString().split('T')[0],
        registration_date: ipRecord.registration_date || '',
        date_modified: ipRecord.date_modified || '',
        userid: ipRecord.userid || '',
        entered_by: ipRecord.entered_by || '',
      };
      setFormData(mappedData);
      setIsNewRecord(false);
      // Enable all tabs for existing records
      setEnabledTabs(['basic', 'address', 'relations', 'employment', 'dependents', 'notes', 'verification']);
    }
  }, [ipRecord]);

  useEffect(() => {
    if (dependentsData) {
      setDependents(dependentsData.map((d: any) => ({
        id: d.id,
        ip_id: d.ip_id,
        unique_uuid: d.unique_uuid,
        depend_id: d.depend_id || '',
        depend_ssn: d.depend_ssn || d.ssn || '',
        surname: d.surname || d.last_name || '',
        firstname: d.firstname || d.first_name || '',
        middle_name_dep: d.middle_name_dep || d.middle_name || '',
        dob: d.dob || d.date_of_birth || '',
        sex: d.sex || d.gender || '',
        relation: d.relation || d.relation_type || '',
        depend_addr1: d.depend_addr1 || d.address || '',
        depend_addr2: d.depend_addr2 || '',
        school_child: d.school_child || 'N',
        invalid: d.invalid || 'N',
        date_modified: d.date_modified || d.updated_at || '',
        userid: d.userid || '',
        tran_code: d.tran_code || '',
        status: d.status || 'P',
        date_of_death: d.date_of_death || '',
      })));
    }
  }, [dependentsData]);

  useEffect(() => {
    if (notesData) {
      setNotes(notesData.map((n: any) => ({
        ssn: n.ssn || '',
        note_date: n.note_date || n.created_at || '',
        note: n.note || n.note_content || '',
        userid: n.userid || '',
        note_tran_code: n.note_tran_code || n.note_type || '',
        note_seq: n.note_seq || 0,
      })));
    }
  }, [notesData]);

  // Generate temp SSN
  const generateTempSSN = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_temp_ssn');
    if (error) {
      // Fallback: generate client-side
      const timestamp = Date.now().toString().slice(-5);
      return `T${timestamp}`;
    }
    return data;
  };

  // Show success animation helper
  const showSuccessAnimation = useCallback(() => {
    setSaveSuccessAnimation(true);
    setTimeout(() => setSaveSuccessAnimation(false), 2000);
  }, []);

  // Save Basic Details (create new record)
  const saveBasicDetails = useCallback(async () => {
    if (isSavingRef.current) return null;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      let ssnToUse = formData.ssn;
      
      if (isNewRecord && !ssnToUse) {
        ssnToUse = await generateTempSSN();
      }

      const dataToSave = {
        ssn: ssnToUse,
        surname: formData.surname,
        firstname: formData.firstname,
        middle_name: formData.middle_name,
        previous_name: formData.previous_name,
        alias: formData.alias,
        sex: formData.sex,
        dob: formData.dob || null,
        birth_place_code: formData.birth_place_code,
        nationality_code: formData.nationality_code,
        marital_status: formData.marital_status,
        heightfeet: formData.heightfeet,
        heightinches: formData.heightinches,
        eyecolor: formData.eyecolor,
        name_prefix: formData.name_prefix,
        name_suffix: formData.name_suffix,
        status: 'Z', // Draft status
        application_date: formData.application_date || new Date().toISOString().split('T')[0],
        date_of_entry: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        // Also save to legacy columns for compatibility
        last_name: formData.surname,
        first_name: formData.firstname,
        gender: formData.sex,
        date_of_birth: formData.dob || null,
        birth_place: formData.birth_place_code,
        nationality: formData.nationality_code,
        title: formData.name_prefix,
        suffix: formData.name_suffix,
        maiden_name: formData.previous_name,
        height_feet: formData.heightfeet,
        height_inches: formData.heightinches,
        eye_color: formData.eyecolor,
      };

      if (isNewRecord) {
        const { data, error } = await supabase
          .from('ip_master')
          .insert([dataToSave as any])
          .select()
          .single();

        if (error) throw error;
        
        setFormData(prev => ({ ...prev, ssn: ssnToUse }));
        setIsNewRecord(false);
        setEnabledTabs(['basic', 'address', 'relations', 'employment', 'dependents', 'notes', 'verification']);
        
        toast({
          title: 'Basic Details Saved',
          description: `Temporary SSN assigned: ${ssnToUse}`,
        });

        showSuccessAnimation();
        return ssnToUse;
      } else {
        const { error } = await supabase
          .from('ip_master')
          .update(dataToSave as any)
          .eq('ssn', ssnToUse);

        if (error) throw error;
        
        toast({
          title: 'Basic Details Updated',
          description: 'Changes saved successfully.',
        });

        showSuccessAnimation();
        return ssnToUse;
      }
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [formData, isNewRecord, toast, showSuccessAnimation]);

  // Save Address & Contact
  const saveAddressContact = useCallback(async () => {
    if (isSavingRef.current || !formData.ssn) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('ip_master')
        .update({
          resident_addr1: formData.resident_addr1,
          resident_addr2: formData.resident_addr2,
          district: formData.district,
          mail_addr1: formData.mail_addr1,
          mail_addr2: formData.mail_addr2,
          email_addr: formData.email_addr,
          phone: formData.phone,
          phone_mobile: formData.phone_mobile,
          date_modified: new Date().toISOString(),
          // Legacy columns
          resident_address_1: formData.resident_addr1,
          resident_address_2: formData.resident_addr2,
          postal_district: formData.district,
          email: formData.email_addr,
          telephone: formData.phone,
          mobile: formData.phone_mobile,
        })
        .eq('ssn', formData.ssn);

      if (error) throw error;

      showSuccessAnimation();
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [formData, toast, showSuccessAnimation]);

  // Save Relations
  const saveRelations = useCallback(async () => {
    if (isSavingRef.current || !formData.ssn) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('ip_master')
        .update({
          contact: formData.contact,
          contact_relation: formData.contact_relation,
          contact_addr1: formData.contact_addr1,
          contact_addr2: formData.contact_addr2,
          contact_phone: formData.contact_phone,
          contact_mobile: formData.contact_mobile,
          contact_email: formData.contact_email,
          father_name: formData.father_name,
          mother_name: formData.mother_name,
          spouse_name: formData.spouse_name,
          spouse_addr1: formData.spouse_addr1,
          spouse_addr2: formData.spouse_addr2,
          spouse_ssn: formData.spouse_ssn,
          spouse_dob: formData.spouse_dob || null,
          witness_name: formData.witness_name,
          date_witnessed: formData.date_witnessed || null,
          beneficiary: formData.beneficiary,
          ben_addr1: formData.ben_addr1,
          ben_addr2: formData.ben_addr2,
          date_modified: new Date().toISOString(),
        })
        .eq('ssn', formData.ssn);

      if (error) throw error;

      showSuccessAnimation();
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [formData, toast, showSuccessAnimation]);

  // Save Employment Details
  const saveEmploymentDetails = useCallback(async () => {
    if (isSavingRef.current || !formData.ssn) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('ip_master')
        .update({
          work_permit: formData.work_permit,
          primary_occup: formData.primary_occup,
          npf: formData.npf,
          application_date: formData.application_date || null,
          date_of_residency: formData.date_of_residency || null,
          place_of_residence_code: formData.place_of_residence_code,
          citizenship_flag: formData.citizenship_flag,
          ip_signature: formData.ip_signature,
          work_permit_expiration: formData.work_permit_expiration || null,
          date_modified: new Date().toISOString(),
          // Legacy columns
          work_permit_status: formData.work_permit,
          occupation: formData.primary_occup,
          npf_status: formData.npf,
          date_resident: formData.date_of_residency || null,
          place_of_residence: formData.place_of_residence_code,
          citizenship: formData.citizenship_flag,
          signature_on_file: formData.ip_signature,
          work_permit_expiry: formData.work_permit_expiration || null,
        })
        .eq('ssn', formData.ssn);

      if (error) throw error;

      showSuccessAnimation();
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [formData, toast, showSuccessAnimation]);

  // Save Verification
  const saveVerification = useCallback(async () => {
    if (isSavingRef.current || !formData.ssn) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('ip_master')
        .update({
          verify_birth_code: formData.verify_birth_code,
          verify_name_code: formData.verify_name_code,
          verify_marital_code: formData.verify_marital_code,
          verify_death_code: formData.verify_death_code,
          date_verified: formData.date_verified || null,
          verified_by: formData.verified_by,
          date_modified: new Date().toISOString(),
          // Legacy columns
          birth_doc_type: formData.verify_birth_code,
          name_doc_type: formData.verify_name_code,
          marital_doc_type: formData.verify_marital_code,
          death_doc_type: formData.verify_death_code,
        })
        .eq('ssn', formData.ssn);

      if (error) throw error;

      showSuccessAnimation();
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [formData, toast, showSuccessAnimation]);

  // Save current tab data
  const saveCurrentTab = useCallback(async () => {
    switch (currentTab) {
      case 'basic':
        return await saveBasicDetails();
      case 'address':
        await saveAddressContact();
        break;
      case 'relations':
        await saveRelations();
        break;
      case 'employment':
        await saveEmploymentDetails();
        break;
      case 'verification':
        await saveVerification();
        break;
    }
    return formData.ssn;
  }, [currentTab, saveBasicDetails, saveAddressContact, saveRelations, saveEmploymentDetails, saveVerification, formData.ssn]);

  // Handle tab change with auto-save (optional skip for view mode)
  const handleTabChange = useCallback(async (newTab: string, skipSave?: boolean) => {
    if (currentTab !== newTab && formData.ssn && !skipSave) {
      await saveCurrentTab();
    }
    setCurrentTab(newTab);
  }, [currentTab, formData.ssn, saveCurrentTab]);

  // Submit (change status from Z to P)
  const submitRegistration = useCallback(async () => {
    if (!formData.ssn) {
      toast({
        title: 'Error',
        description: 'Please save Basic Details first.',
        variant: 'destructive',
      });
      return false;
    }

    if (isSavingRef.current) return false;
    isSavingRef.current = true;
    setIsSaving(true);
    
    try {
      // Save all pending changes first
      await saveCurrentTab();

      // Update status to Pending
      const { error } = await supabase
        .from('ip_master')
        .update({
          status: 'P',
          registration_date: new Date().toISOString().split('T')[0],
          date_modified: new Date().toISOString(),
        })
        .eq('ssn', formData.ssn);

      if (error) throw error;

      setFormData(prev => ({ ...prev, status: 'P' }));
      
      toast({
        title: 'Registration Submitted',
        description: 'The registration has been submitted for verification.',
      });

      queryClient.invalidateQueries({ queryKey: ['ip_master'] });
      return true;
    } catch (error: any) {
      toast({
        title: 'Error submitting',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [formData.ssn, saveCurrentTab, toast, queryClient]);

  // Add dependent
  const addDependent = useCallback(async (dependent: IPDependentData) => {
    if (!formData.ssn) return;

    try {
      // Generate depend_id using the stored procedure
      const { data: nextIdData } = await supabase.rpc('generate_depend_id', { p_ssn: formData.ssn });
      const dependId = nextIdData || '000001';

      const dependentData = {
        ssn: formData.ssn,
        depend_id: dependId,
        depend_ssn: dependent.depend_ssn,
        surname: dependent.surname,
        firstname: dependent.firstname,
        middle_name: dependent.middle_name_dep,
        dob: dependent.dob || null,
        sex: dependent.sex,
        relation: dependent.relation,
        depend_addr1: dependent.depend_addr1,
        depend_addr2: dependent.depend_addr2,
        school_child: dependent.school_child,
        invalid: dependent.invalid,
        status: 'P',
        date_modified: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('ip_depend')
        .insert([dependentData as any]);

      if (error) throw error;

      setDependents(prev => [...prev, { ...dependent, depend_id: dependId }]);
      
      toast({
        title: 'Dependent Added',
        description: 'Dependent has been added successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error adding dependent',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [formData.ssn, toast]);

  // Soft delete dependent
  const deleteDependent = useCallback(async (dependentId: string) => {
    try {
      // dependentId now contains "ssn-depend_id" format
      const [ssn, dependId] = dependentId.split('-');
      const { error } = await supabase
        .from('ip_depend')
        .update({ status: 'D', date_modified: new Date().toISOString() } as any)
        .eq('ssn', ssn)
        .eq('depend_id', dependId);

      if (error) throw error;

      setDependents(prev => prev.filter(d => `${d.ssn}-${d.depend_id}` !== dependentId));
      
      toast({
        title: 'Dependent Removed',
        description: 'Dependent has been removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Error removing dependent',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Add note
  const addNote = useCallback(async (noteContent: string) => {
    if (!formData.ssn) return;

    try {
      const noteData = {
        ssn: formData.ssn,
        note: noteContent,
        note_date: new Date().toISOString(),
        note_tran_code: 'ADD',
      };
      
      const { error } = await supabase
        .from('ip_notes')
        .insert([noteData as any]);

      if (error) throw error;

      setNotes(prev => [{ 
        ssn: formData.ssn, 
        note_date: new Date().toISOString(), 
        note: noteContent,
        userid: '',
        note_tran_code: 'ADD',
        note_seq: 0,
      }, ...prev]);
      
      toast({
        title: 'Note Added',
        description: 'Note has been added successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error adding note',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [formData.ssn, toast]);

  // Update form field
  const updateField = useCallback((field: keyof IPMasterFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Check if form is editable (status Z only)
  const isEditable = formData.status === 'Z' || isNewRecord;

  return {
    formData,
    setFormData,
    updateField,
    dependents,
    setDependents,
    notes,
    isNewRecord,
    isSaving,
    saveSuccessAnimation,
    currentTab,
    enabledTabs,
    isEditable,
    isLoading: isLoadingIP || isLoadingDependents || isLoadingNotes,
    saveBasicDetails,
    saveAddressContact,
    saveRelations,
    saveEmploymentDetails,
    saveVerification,
    saveCurrentTab,
    handleTabChange,
    submitRegistration,
    addDependent,
    deleteDependent,
    addNote,
  };
};
