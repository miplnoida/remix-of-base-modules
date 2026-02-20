import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Users, FileText, Building, Camera, Globe, Briefcase, Settings2, DollarSign, MapPin, Receipt, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Stepper, StepperStep } from '@/components/ui/stepper';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { validateContactFields } from '@/lib/contactValidation';
import { useUserCode } from '@/hooks/useUserCode';
import BasicDetailsTab from './tabs/BasicDetailsTab';
import AddressContactTab from './tabs/AddressContactTab';
import RelationsTab from './tabs/RelationsTab';
import EmploymentTab from './tabs/EmploymentTab';
import DocumentVerificationTab from './tabs/DocumentVerificationTab';
import DependentsTab from './tabs/DependentsTab';
import NotesTab from './tabs/NotesTab';
import EmploymentHistoryTab from './tabs/EmploymentHistoryTab';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import SuccessAnimation from '@/components/shared/SuccessAnimation';
import { useIPStatuses, getStatusDescription } from '@/hooks/useIPMasterLookups';
import { useIPRegistrationSubmit } from '@/hooks/useIPRegistrationSubmit';
import { WorkflowActionButtons } from '@/components/workflow/WorkflowActionButtons';
import { useHasEmploymentHistory } from '@/hooks/useEmploymentHistory';
import { VCEligibilityModal } from '@/components/ip-registration/VCEligibilityModal';
import { IPStatusChangeDialog } from '@/components/ip-registration/IPStatusChangeDialog';
import { SelfEmployDetailsTab, WagesCategoryTab, BusinessLocationsTab, ContributionHistoryTab, SEPStatusPanel } from '@/components/ip/sep';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';
import { useWorkflowInitialization } from '@/hooks/useWorkflowInitialization';
import { WorkflowInitiationDialog } from '@/components/workflow/WorkflowInitiationDialog';

export interface IPFormData {
  id?: string;
  unique_uuid: string;
  application_id: string;
  ssn?: string | null;
  name_prefix?: string | null;
  firstname?: string | null;
  middle_name?: string | null;
  second_middle_name?: string | null;
  surname?: string | null;
  name_suffix?: string | null;
  previous_name?: string | null;
  alias?: string | null;
  sex?: string | null;
  dob?: string | null;
  marital_status?: string | null;
  date_married?: string | null;
  heightfeet?: number | null;
  heightinches?: number | null;
  birth_place?: string | null;
  nationality?: string | null;
  eyecolor?: string | null;
  resident_addr1?: string | null;
  resident_addr2?: string | null;
  district?: string | null;
  mail_addr1?: string | null;
  mail_addr2?: string | null;
  employer_name?: string | null;
  employer_address?: string | null;
  employer_phone?: string | null;
  employer_town?: string | null;
  email_addr?: string | null;
  telephone?: string | null;
  mobile?: string | null;
  primary_occup?: string | null;
  work_permit?: string | null;
  npf?: string | null;
  application_date?: string | null;
  date_of_residency?: string | null;
  place_of_residence?: string | null;
  work_permit_expiration?: string | null;
  citizenship?: string | null;
  ip_signature?: string | null;
  marital_doc_type?: string | null;
  birth_doc_type?: string | null;
  death_doc_type?: string | null;
  name_doc_type?: string | null;
  // Relations fields stored in ip_master
  contact?: string | null;
  contact_relation?: string | null;
  contact_addr1?: string | null;
  contact_addr2?: string | null;
  contact_phone?: string | null;
  contact_mobile?: string | null;
  contact_email?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  spouse_name?: string | null;
  spouse_addr1?: string | null;
  spouse_addr2?: string | null;
  spouse_ssn?: string | null;
  spouse_dob?: string | null;
  witness_name?: string | null;
  date_witnessed?: string | null;
  beneficiary?: string | null;
  ben_addr1?: string | null;
  ben_addr2?: string | null;
  status: string;
  created_by?: string | null;
  entered_by?: string | null;
  created_at?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
  submitted_by?: string | null;
  submitted_at?: string | null;
  verified_by?: string | null;
  date_verified?: string | null;
  rejected_by?: string | null;
  date_rejected?: string | null;
  rejection_reason?: string | null;
}

interface ValidationErrors {
  [key: string]: string;
}

// Normalize title values from DB (e.g. 'Mr.' -> 'Mr') to match dropdown options
const normalizeTitleValue = (val: string | null | undefined): string => {
  if (!val) return '';
  const stripped = val.replace(/\.$/, '').trim(); // Remove trailing period
  const titleMap: Record<string, string> = {
    'mr': 'Mr', 'mrs': 'Mrs', 'ms': 'Ms', 'miss': 'Miss',
    'dr': 'Dr', 'hon': 'Hon', 'rev': 'Rev', 'prof': 'Prof',
  };
  return titleMap[stripped.toLowerCase()] || stripped;
};

// Normalize marital status from DB codes to label values used by dropdowns
const normalizeMaritalStatus = (val: string | null | undefined): string => {
  if (!val) return '';
  const codeMap: Record<string, string> = {
    'S': 'Single', 'M': 'Married', 'D': 'Divorced',
    'W': 'Widowed', 'P': 'Separated', 'C': 'Common Law', 'U': 'Unknown',
  };
  // If it's a single-char code, map it; otherwise return as-is (already a label)
  if (val.length === 1 && codeMap[val.toUpperCase()]) {
    return codeMap[val.toUpperCase()];
  }
  return val;
};

const tabSteps = [
  { id: 'basic', label: 'Basic Details', icon: User },
  { id: 'address', label: 'Address & Contact', icon: User },
  { id: 'relations', label: 'Relations', icon: Users },
  { id: 'employment', label: 'Employment Details', icon: Building },
  { id: 'documents', label: 'Document Verification', icon: FileText },
];

// Initial empty form data for new registrations
const getInitialFormData = (): IPFormData => ({
  unique_uuid: crypto.randomUUID(),
  application_id: '',
  status: 'Z', // Draft status
  application_date: new Date().toISOString().split('T')[0],
});

export default function IPRegistrationForm() {
  const { uniqueUuid } = useParams<{ uniqueUuid: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userCode } = useUserCode();
  const { data: ipStatuses } = useIPStatuses();
  const isViewMode = window.location.pathname.includes('/view/');
  const isNewMode = window.location.pathname.includes('/new');
  const action = searchParams.get('action');
  
  const [formData, setFormData] = useState<IPFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [activeMainTab, setActiveMainTab] = useState('register');
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showStepSuccess, setShowStepSuccess] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [showVCSection, setShowVCSection] = useState(false);
  const [sepRegistrationMode, setSepRegistrationMode] = useState(false);
  const hasShownSuccessRef = useRef(false);

  // Initialize SEP hook with the person's SSN
  const selfEmployed = useSelfEmployed(formData?.ssn && !formData.ssn.startsWith('T') ? formData.ssn : null);

  // Conditional workflow initialization on page load (must be called before early returns)
  const workflowInit = useWorkflowInitialization({
    uniqueUuid: formData?.unique_uuid,
    status: formData?.status,
    ssn: formData?.ssn || undefined,
    recordName: `${formData?.firstname || ''} ${formData?.surname || ''}`.trim(),
    userId: user?.id,
    skip: isNewMode || isNewRecord || loading || !formData,
  });
  
  // Determine if person is already registered as self-employed (has activities from DB) or in registration mode
  const isSelfEmployed = selfEmployed.activities.length > 0;
  const showSepTabs = isSelfEmployed || sepRegistrationMode;

  // Handle "Register as Self Employed" action - navigate to edit mode with SEP tabs
  const handleRegisterAsSelfEmployed = useCallback(() => {
    if (!formData) return;
    // Navigate to edit route with openTab param so SEP tabs appear inline
    navigate(`/ip-registration/edit/${formData.unique_uuid}?openTab=self-employ`);
  }, [formData, navigate]);

  // Handle cancellation of SEP registration - go back to view mode
  const handleSepRegistrationCancel = useCallback(() => {
    setSepRegistrationMode(false);
    if (formData) {
      navigate(`/ip-registration/view/${formData.unique_uuid}`);
    } else {
      setActiveMainTab('register');
    }
  }, [formData, navigate]);
  
  // Check if employment history records exist for this SSN

  // Initialize form for new mode (no DB save until explicit save)
  const initializeNewForm = useCallback(async () => {
    setLoading(true);
    try {
      // Generate application ID
      const { data: appIdData, error: appIdError } = await supabase
        .rpc('generate_application_id');
      
      if (appIdError) throw appIdError;

      // Create form data in memory only - NO database insert
      const newFormData = getInitialFormData();
      newFormData.application_id = appIdData;
      newFormData.created_by = user?.id;
      newFormData.entered_by = userCode || undefined;
      
      setFormData(newFormData);
      setIsNewRecord(true);
    } catch (error) {
      console.error('Error initializing form:', error);
      toast.error('Failed to initialize new registration');
      navigate('/ip-registration');
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigate]);

  const fetchData = useCallback(async () => {
    if (!uniqueUuid) return;
    
    setLoading(true);
    try {
      // All records are now in ip_master table (including drafts)
      const { data: recordData, error } = await supabase
        .from('ip_master')
        .select('*')
        .eq('unique_uuid', uniqueUuid)
        .single();

      if (error) throw error;

      let currentSsn = recordData.ssn;

      // Generate temp SSN for draft records (status Z) that don't have one
      if ((recordData.status === 'Z' || recordData.status === 'D') && !currentSsn) {
        const { data: tempSsnData, error: ssnError } = await supabase.rpc('generate_temp_ssn');
        
        if (!ssnError && tempSsnData) {
          // Update the record with the temp SSN
          await supabase
            .from('ip_master')
            .update({ ssn: tempSsnData })
            .eq('unique_uuid', uniqueUuid);
          
          currentSsn = tempSsnData;
        }
      }

      // Cast the data to IPFormData
      setFormData({
        id: recordData.id,
        unique_uuid: recordData.unique_uuid,
        application_id: recordData.application_id,
        ssn: currentSsn,
        name_prefix: normalizeTitleValue(recordData.name_prefix),
        firstname: recordData.firstname,
        middle_name: recordData.middle_name,
        second_middle_name: recordData.second_middle_name,
        surname: recordData.surname,
        name_suffix: recordData.name_suffix,
        previous_name: recordData.previous_name,
        alias: recordData.alias,
        sex: recordData.sex,
        dob: recordData.dob,
        marital_status: normalizeMaritalStatus(recordData.marital_status),
        date_married: recordData.date_married,
        heightfeet: recordData.heightfeet,
        heightinches: recordData.heightinches,
        birth_place: recordData.birth_place,
        nationality: recordData.nationality,
        eyecolor: recordData.eyecolor,
        resident_addr1: recordData.resident_addr1,
        resident_addr2: recordData.resident_addr2,
        district: recordData.district,
        mail_addr1: recordData.mail_addr1,
        mail_addr2: recordData.mail_addr2,
        email_addr: recordData.email_addr,
        telephone: recordData.telephone,
        mobile: recordData.mobile,
        primary_occup: recordData.primary_occup,
        work_permit: recordData.work_permit,
        npf: recordData.npf,
        application_date: recordData.application_date,
        date_of_residency: recordData.date_of_residency,
        place_of_residence: recordData.place_of_residence,
        work_permit_expiration: recordData.work_permit_expiration,
        citizenship: recordData.citizenship,
        ip_signature: recordData.ip_signature,
        employer_name: recordData.employer_name,
        employer_address: recordData.employer_address,
        employer_phone: recordData.employer_phone,
        employer_town: recordData.employer_town,
        marital_doc_type: recordData.marital_doc_type,
        birth_doc_type: recordData.birth_doc_type,
        death_doc_type: recordData.death_doc_type,
        name_doc_type: recordData.name_doc_type,
        // Relations fields
        contact: recordData.contact,
        contact_relation: recordData.contact_relation,
        contact_addr1: recordData.contact_addr1,
        contact_addr2: recordData.contact_addr2,
        contact_phone: recordData.contact_phone,
        contact_mobile: recordData.contact_mobile,
        contact_email: recordData.contact_email,
        father_name: recordData.father_name,
        mother_name: recordData.mother_name,
        spouse_name: recordData.spouse_name,
        spouse_addr1: recordData.spouse_addr1,
        spouse_addr2: recordData.spouse_addr2,
        spouse_ssn: recordData.spouse_ssn,
        spouse_dob: recordData.spouse_dob,
        witness_name: recordData.witness_name,
        date_witnessed: recordData.date_witnessed,
        beneficiary: recordData.beneficiary,
        ben_addr1: recordData.ben_addr1,
        ben_addr2: recordData.ben_addr2,
        status: recordData.status,
        created_by: recordData.created_by,
        created_at: recordData.created_at,
      });
      setIsNewRecord(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load registration data');
      navigate('/ip-registration');
    } finally {
      setLoading(false);
    }
  }, [uniqueUuid, navigate]);

  useEffect(() => {
    if (isNewMode) {
      initializeNewForm();
    } else if (uniqueUuid) {
      fetchData();
    } else {
      navigate('/ip-registration');
    }
  }, [isNewMode, uniqueUuid, fetchData, initializeNewForm, navigate]);

  useEffect(() => {
    if (action === 'submit') {
      setShowSubmitConfirm(true);
    }
    // Handle openTab query param (e.g. from Register as Self Employed)
    const openTab = searchParams.get('openTab');
    if (openTab === 'self-employ') {
      setSepRegistrationMode(true);
      setActiveMainTab('self-employ');
    } else if (openTab) {
      setActiveMainTab(openTab);
    }
  }, [action, searchParams]);

  // Validate current tab before saving
  const validateCurrentTab = useCallback((): boolean => {
    if (!formData) return false;
    const newErrors: ValidationErrors = {};

    if (activeTab === 'basic') {
      if (!formData.firstname?.trim()) newErrors.firstname = 'First name is required';
      if (!formData.surname?.trim()) newErrors.surname = 'Last name is required';
      if (!formData.sex) newErrors.sex = 'Gender is required';
      if (!formData.dob) newErrors.dob = 'Date of birth is required';
      if (!formData.marital_status) newErrors.marital_status = 'Marital status is required';
      if (!formData.nationality) newErrors.nationality = 'Nationality is required';
      if (!formData.birth_place) newErrors.birth_place = 'Birth place is required';
      if (!formData.name_prefix) newErrors.name_prefix = 'Title is required';

      if ((formData.marital_status === 'Married' || formData.marital_status === 'Common Law') && !formData.date_married) {
        newErrors.date_married = 'Date married is required';
      }
    }

    if (activeTab === 'address') {
      // Use centralized validation for phone/mobile/email
      const contactErrors = validateContactFields([
        { value: formData.telephone, fieldName: 'telephone', label: 'Telephone', type: 'phone' },
        { value: formData.mobile, fieldName: 'mobile', label: 'Mobile', type: 'phone' },
        { value: formData.email_addr, fieldName: 'email_addr', label: 'Email', type: 'email' },
      ]);
      Object.assign(newErrors, contactErrors);
    }

    if (activeTab === 'employment') {
      // Work permit expiry required when work permit is Yes
      if (formData.work_permit === 'Y' && !formData.work_permit_expiration) {
        newErrors.work_permit_expiration = 'Work permit expiry date is required when work permit is enabled';
      }
      // Date resident required when birth_place differs from place_of_residence
      if (formData.birth_place && formData.place_of_residence && formData.birth_place !== formData.place_of_residence) {
        if (!formData.date_of_residency) {
          newErrors.date_of_residency = 'Date resident is required when birth place differs from place of residence';
        }
      }
    }

    if (activeTab === 'documents') {
      if (!formData.birth_doc_type) newErrors.birth_doc_type = 'Birth status verification is required';
      if (!formData.name_doc_type) newErrors.name_doc_type = 'Name status verification is required';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error('Please check the form for valid information!', {
        description: firstError,
        style: { 
          backgroundColor: 'hsl(var(--destructive))', 
          color: 'white',
        },
        classNames: {
          toast: '!bg-destructive',
          title: '!text-white',
          description: '!text-white !opacity-100'
        }
      });
      return false;
    }
    return true;
  }, [formData, activeTab]);

  // Save data to database (for drafts) - now saves directly to ip_master
  const saveToDatabase = useCallback(async (data: Partial<IPFormData>, showSuccessMessage = true): Promise<boolean> => {
    if (isViewMode || !formData) return false;
    
    // Only save drafts (status Z or D)
    if (formData.status !== 'Z' && formData.status !== 'D') return false;
    
    setSaving(true);
    try {
      if (isNewRecord) {
        // Generate temporary SSN for new drafts
        const { data: tempSsnData, error: ssnError } = await supabase
          .rpc('generate_temp_ssn');
        
        if (ssnError) throw ssnError;

        // First save - insert new record with status Z directly to ip_master
        const insertData = {
          unique_uuid: formData.unique_uuid,
          application_id: formData.application_id,
          ssn: tempSsnData, // Temporary SSN for dependents/notes
          status: 'Z', // Draft status
          application_date: formData.application_date || new Date().toISOString().split('T')[0],
          // Provide required fields with defaults
          firstname: data.firstname || '',
          surname: data.surname || '',
          sex: data.sex || '',
          dob: data.dob || new Date().toISOString().split('T')[0],
          marital_status: data.marital_status || '',
          nationality: data.nationality || '',
          ...data,
          // Set created_by AFTER spread to prevent overwrite
          created_by: user?.id,
          entered_by: userCode || null,
        };

        const { data: insertedData, error } = await supabase
          .from('ip_master')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        
        setFormData(prev => prev ? { ...prev, ...insertedData, id: insertedData.id, ssn: insertedData.ssn } : null);
        setIsNewRecord(false);
        
        // Navigate to edit mode with the new UUID
        navigate(`/ip-registration/edit/${formData.unique_uuid}`, { replace: true });
        
        if (showSuccessMessage && !hasShownSuccessRef.current) {
          toast.success('Draft saved successfully');
          hasShownSuccessRef.current = true;
          setTimeout(() => { hasShownSuccessRef.current = false; }, 1000);
        }
      } else {
        // Update existing record in ip_master
        const { error } = await supabase
          .from('ip_master')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq('unique_uuid', formData.unique_uuid);

        if (error) throw error;
        
        setFormData(prev => prev ? { ...prev, ...data } : null);
        
        if (showSuccessMessage && !hasShownSuccessRef.current) {
          toast.success('Changes saved');
          hasShownSuccessRef.current = true;
          setTimeout(() => { hasShownSuccessRef.current = false; }, 1000);
        }
      }
      return true;
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save changes');
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, isViewMode, isNewRecord, user?.id, navigate]);

  const clearError = useCallback((field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    if (!formData) return;
    
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    clearError(field);

    // Check for duplicates on key fields
    if (['firstname', 'surname', 'dob', 'sex'].includes(field)) {
      checkDuplicates(newData);
    }
  }, [formData, clearError]);

  const checkDuplicates = async (data: IPFormData) => {
    if (!data.firstname || !data.surname || !data.dob || !data.sex) return;

    try {
      const { data: dups, error } = await supabase
        .rpc('check_ip_duplicates', {
          p_first_name: data.firstname,
          p_last_name: data.surname,
          p_dob: data.dob,
          p_gender: data.sex,
          p_exclude_uuid: data.unique_uuid,
        });

      if (error) throw error;
      
      if (dups && dups.length > 0) {
        setDuplicates(dups);
        setShowDuplicateWarning(true);
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
    }
  };

  // Handle "Save & Continue" button click
  const handleSaveAndContinue = useCallback(async () => {
    // Don't save in view mode
    if (isViewMode) return;
    
    // Validate current tab
    if (!validateCurrentTab()) return;
    
    // Save to database
    const saved = await saveToDatabase(formData || {});
    if (!saved && !isNewRecord) return;

    // Mark current tab as completed
    if (!completedTabs.includes(activeTab)) {
      setCompletedTabs(prev => [...prev, activeTab]);
    }

    // Move to next tab
    const currentIndex = tabSteps.findIndex(t => t.id === activeTab);
    if (currentIndex < tabSteps.length - 1) {
      setPendingTabChange(tabSteps[currentIndex + 1].id);
      setShowStepSuccess(true);
    } else {
      // Last sub-tab (Document Verification) — move to Dependent main tab
      setPendingTabChange('__main_dependent__');
      setShowStepSuccess(true);
    }
  }, [isViewMode, validateCurrentTab, saveToDatabase, formData, completedTabs, activeTab, isNewRecord]);

  const handleTabChange = (newTab: string) => {
    // In View mode, don't save - just switch tabs
    if (isViewMode) {
      setActiveTab(newTab);
      return;
    }
    
    // For direct tab clicks (not save & continue), just switch without saving
    setActiveTab(newTab);
  };

  const handleSuccessComplete = useCallback(() => {
    setShowStepSuccess(false);
    if (pendingTabChange) {
      if (pendingTabChange === '__main_dependent__') {
        // Switch to Dependent main tab
        setActiveMainTab('dependent');
        setActiveTab('basic'); // Reset sub-tab for next time
      } else {
        setActiveTab(pendingTabChange);
      }
      setPendingTabChange(null);
    }
  }, [pendingTabChange]);

  // Use the unified submit hook
  const { submitIPRegistration, isSubmitting: isSubmittingHook } = useIPRegistrationSubmit();

  const handleSubmit = async () => {
    if (!formData) return;

    try {
      // First ensure the record is saved
      if (isNewRecord) {
        const saved = await saveToDatabase(formData, false);
        if (!saved) throw new Error('Failed to save draft');
      }

      // Use the unified submit function
      const result = await submitIPRegistration(formData.unique_uuid, user?.id);
      
      if (result.success) {
        toast.success(result.message);
        navigate('/ip-registration');
      } else if (result.errors) {
        setErrors(result.errors);
        const firstError = Object.values(result.errors)[0];
        toast.error('Please check the form for valid information!', {
          description: firstError,
          style: { backgroundColor: 'hsl(var(--destructive))', color: 'white' },
          classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' }
        });
      } else {
        toast.error(result.message || 'Failed to submit registration');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit registration');
    } finally {
      setShowSubmitConfirm(false);
    }
  };

  // Approve/Reject actions are now handled by WorkflowActionButtons component
  const handleWorkflowActionComplete = (action: string, endState: string | null) => {
    navigate('/ip-registration');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Registration not found</p>
          <Button onClick={() => navigate('/ip-registration')} className="mt-4">
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const isEditable = !isViewMode && (formData.status === 'Z' || formData.status === 'D');
  const canApprove = formData.status === 'P' && formData.created_by !== user?.id;

  // workflowInit is now called above early returns (hooks must be unconditional)

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Success Animation for Tab Transitions */}
      <SuccessAnimation
        show={showStepSuccess}
        onComplete={handleSuccessComplete}
        duration={800}
        message="Step completed"
      />
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/ip-registration')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {isViewMode ? 'View' : isNewRecord ? 'New' : 'Edit'} Insured Person
            </h1>
            <p className="text-muted-foreground">
              Application ID: {formData.application_id} | Status: {ipStatuses ? getStatusDescription(formData.status, ipStatuses) : formData.status}
              {formData.ssn && ` | SSN: ${formData.ssn}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {saving && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Saving...
            </span>
          )}
          {/* Edit button in View mode to switch to Edit mode */}
          {isViewMode && (formData.status === 'Z' || formData.status === 'D') && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/ip-registration/edit/${formData.unique_uuid}`)}
            >
              Edit
            </Button>
          )}
          {/* Status Change button - Only in View mode for non-editable records */}
          {isViewMode && !['Z', 'P'].includes(formData.status) && (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowStatusChangeDialog(true)}
                className="flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Change Status
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowVCSection(true)}
                className="flex items-center gap-2"
              >
                <HeartHandshake className="h-4 w-4" />
                VC Eligibility
              </Button>
              {/* Register as Self Employed - only if not already registered and has permanent SSN */}
              {formData.ssn && !formData.ssn.startsWith('T') && !isSelfEmployed && !sepRegistrationMode && (
                <Button 
                  variant="outline"
                  onClick={handleRegisterAsSelfEmployed}
                  className="flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Register as Self Employed
                </Button>
              )}
            </>
          )}
          {/* Register as Self Employed - also available in Edit mode for non-draft records */}
          {!isViewMode && formData.ssn && !formData.ssn.startsWith('T') && !isSelfEmployed && !sepRegistrationMode && !['Z', 'P'].includes(formData.status) && (
            <Button 
              variant="outline"
              onClick={handleRegisterAsSelfEmployed}
              className="flex items-center gap-2"
            >
              <Briefcase className="h-4 w-4" />
              Register as Self Employed
            </Button>
          )}
          {isEditable && (
            <Button onClick={() => setShowSubmitConfirm(true)}>
              Submit
            </Button>
          )}
          {/* Workflow-driven action buttons - show for any status if workflow exists and user has permission */}
          {/* The WorkflowActionButtons component handles permission checking internally */}
          <WorkflowActionButtons
            sourceModule="insured_person_registration"
            sourceRecordId={formData.unique_uuid}
            onActionComplete={handleWorkflowActionComplete}
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="register" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Register Person</span>
              </TabsTrigger>
              <TabsTrigger value="dependent" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Dependent</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Notes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="employment-history" 
                className="flex items-center gap-2"
                disabled={!formData.ssn || isNewRecord}
              >
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Emp. History</span>
              </TabsTrigger>
              <TabsTrigger value="npf" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">NPF</span>
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Photo</span>
              </TabsTrigger>
              <TabsTrigger value="caricom" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Caricom</span>
              </TabsTrigger>
              {/* Self-Employed tabs - only visible if registered as self-employed */}
              {showSepTabs && (
                <>
                  <TabsTrigger 
                    value="self-employ" 
                    className="flex items-center gap-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden sm:inline">Self Emp.</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="wages-category" 
                    className="flex items-center gap-2"
                    disabled={!isSelfEmployed}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Wages</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="business-locations" 
                    className="flex items-center gap-2"
                    disabled={!isSelfEmployed}
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">Locations</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="contributions" 
                    className="flex items-center gap-2"
                    disabled={!isSelfEmployed}
                  >
                    <Receipt className="h-4 w-4" />
                    <span className="hidden sm:inline">Contributions</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sep-status" 
                    className="flex items-center gap-2"
                    disabled={!isSelfEmployed}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">SEP Status</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="register" className="mt-6">
              {/* Step Progress */}
              {/* Section Stepper */}
              <Stepper
                steps={tabSteps.map((step, index) => ({
                  id: step.id,
                  title: step.label,
                  status: activeTab === step.id 
                    ? 'current' 
                    : completedTabs.includes(step.id) 
                      ? 'completed' 
                      : 'upcoming'
                } as StepperStep))}
                currentStep={tabSteps.findIndex(s => s.id === activeTab)}
                onStepClick={(index) => handleTabChange(tabSteps[index].id)}
                className="mb-6"
              />

              {/* Tab Content */}
              {activeTab === 'basic' && (
                <BasicDetailsTab
                  formData={formData}
                  onChange={handleFieldChange}
                  onSave={() => {}} // No auto-save on field change
                  errors={errors}
                  isEditable={isEditable}
                  clearError={clearError}
                />
              )}
              {activeTab === 'address' && (
                <AddressContactTab
                  formData={formData}
                  onChange={handleFieldChange}
                  onSave={(data) => saveToDatabase(data, false)}
                  errors={errors}
                  isEditable={isEditable}
                  clearError={clearError}
                />
              )}
              {activeTab === 'relations' && (
                <RelationsTab
                  formData={formData}
                  onChange={handleFieldChange} 
                  isEditable={isEditable}
                  uniqueUuid={formData.unique_uuid}
                  onRefresh={fetchData}
                />
              )}
              {activeTab === 'employment' && (
                <EmploymentTab
                  formData={formData}
                  onChange={handleFieldChange}
                  onSave={() => {}}
                  errors={errors}
                  isEditable={isEditable}
                  clearError={clearError}
                />
              )}
              {activeTab === 'documents' && (
                <DocumentVerificationTab
                  formData={formData}
                  onChange={handleFieldChange}
                  onSave={() => {}}
                  errors={errors}
                  isEditable={isEditable}
                  clearError={clearError}
                />
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = tabSteps.findIndex(t => t.id === activeTab);
                    if (currentIndex > 0) {
                      handleTabChange(tabSteps[currentIndex - 1].id);
                    }
                  }}
                  disabled={activeTab === 'basic'}
                >
                  ← Back
                </Button>
                {/* Show Save & Continue in Edit mode (not on last tab) */}
                {isEditable && activeTab !== 'documents' && (
                  <Button onClick={handleSaveAndContinue}>
                    Save & Continue →
                  </Button>
                )}
                {/* Show Next button in View mode */}
                {isViewMode && activeTab !== 'documents' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = tabSteps.findIndex(t => t.id === activeTab);
                      if (currentIndex < tabSteps.length - 1) {
                        handleTabChange(tabSteps[currentIndex + 1].id);
                      }
                    }}
                  >
                    Next →
                  </Button>
                )}
                {/* Save button on last tab */}
                {isEditable && activeTab === 'documents' && (
                  <Button onClick={() => saveToDatabase(formData)}>
                    Save
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Dependent Tab */}
            <TabsContent value="dependent" className="mt-6">
              <DependentsTab
                uniqueUuid={formData.unique_uuid}
                ssn={formData.ssn}
                recordStatus={formData.status}
                isEditable={isEditable}
              />
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-6">
              <NotesTab
                uniqueUuid={formData.unique_uuid}
                ssn={formData.ssn}
                recordStatus={formData.status}
                isEditable={isEditable}
              />
            </TabsContent>

            {/* Employment History Tab - Read Only */}
            <TabsContent value="employment-history" className="mt-6">
              <EmploymentHistoryTab ssn={formData.ssn} />
            </TabsContent>

            {/* NPF Tab - Placeholder */}
            <TabsContent value="npf" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                NPF information will be displayed here.
              </div>
            </TabsContent>

            {/* Photo Tab - Placeholder */}
            <TabsContent value="photo" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                Photo management will be displayed here.
              </div>
            </TabsContent>

            {/* Caricom Tab - Placeholder */}
            <TabsContent value="caricom" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                CARICOM information will be displayed here.
              </div>
            </TabsContent>

            {/* Self-Employed Tab Contents - only rendered if registered */}
            {showSepTabs && (
              <>
                <TabsContent value="self-employ" className="mt-6">
                  <SelfEmployDetailsTab 
                    ssn={formData.ssn || ''} 
                    selfEmployed={selfEmployed} 
                    isRegistrationMode={sepRegistrationMode && !isSelfEmployed}
                    onRegistrationComplete={() => {
                      // After successful registration, refresh activities and exit registration mode
                      selfEmployed.loadActivities();
                      setSepRegistrationMode(false);
                      toast.success('Self-employed registration completed successfully');
                    }}
                    onRegistrationCancel={handleSepRegistrationCancel}
                  />
                </TabsContent>
                <TabsContent value="wages-category" className="mt-6">
                  <WagesCategoryTab ssn={formData.ssn || ''} selfEmployed={selfEmployed} />
                </TabsContent>
                <TabsContent value="business-locations" className="mt-6">
                  <BusinessLocationsTab ssn={formData.ssn || ''} selfEmployed={selfEmployed} />
                </TabsContent>
                <TabsContent value="contributions" className="mt-6">
                  <ContributionHistoryTab ssn={formData.ssn || ''} selfEmployed={selfEmployed} />
                </TabsContent>
                <TabsContent value="sep-status" className="mt-6">
                  <SEPStatusPanel ssn={formData.ssn || ''} selfEmployed={selfEmployed} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Voluntary Contributor Eligibility Modal */}
      <VCEligibilityModal
        open={showVCSection}
        onOpenChange={setShowVCSection}
        ssn={formData.ssn || ''}
        personName={`${formData.firstname || ''} ${formData.surname || ''}`.trim()}
      />

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potential Duplicates Found</AlertDialogTitle>
            <AlertDialogDescription>
              The following records have similar information:
              <ul className="mt-2 space-y-1">
                {duplicates.map((dup, i) => (
                  <li key={i} className="text-sm">
                    SSN: {dup.ssn} - {dup.full_name} ({dup.match_score}% match)
                  </li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDuplicateWarning(false)}>
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Confirmation Dialog */}
      <AlertDialog 
        open={showSubmitConfirm} 
        onOpenChange={(open) => {
          // Prevent closing during submission
          if (!open && !isSubmittingHook) {
            setShowSubmitConfirm(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit the registration for verification. A 6-digit SSN will be generated.
              You will not be able to edit after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingHook}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleSubmit}
              disabled={isSubmittingHook}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmittingHook ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Status Change Dialog */}
      <IPStatusChangeDialog
        open={showStatusChangeDialog}
        onOpenChange={setShowStatusChangeDialog}
        uniqueUuid={formData.unique_uuid}
        currentStatus={formData.status}
        ssn={formData.ssn}
        personName={`${formData.firstname || ''} ${formData.surname || ''}`.trim()}
        onStatusChanged={fetchData}
      />
      {/* Approve/Reject dialogs removed - now handled by WorkflowActionButtons component */}

      {/* Workflow Initiation Confirmation Dialog */}
      <WorkflowInitiationDialog
        open={workflowInit.showDialog}
        onOpenChange={(open) => { if (!open) workflowInit.declineWorkflow(); }}
        eligibility={workflowInit.eligibility}
        applicationStatus={formData.status}
        recordName={`${formData.firstname || ''} ${formData.surname || ''}`.trim()}
        onConfirm={workflowInit.confirmWorkflow}
        onDecline={workflowInit.declineWorkflow}
        isInitiating={workflowInit.isInitiating}
      />
    </div>
  );
}
