import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ERMasterFormData, 
  EROwnerData, 
  ERLocationData, 
  ERNoteData,
  ERCommenceData,
  initialERMasterFormData 
} from '@/types/employerRegistration';

interface UseEmployerRegistrationOptions {
  regno?: string;
  mode: 'create' | 'edit' | 'view';
}

// Generate temporary registration number for draft records
const generateTempRegNo = async (): Promise<string> => {
  // Call the database function to generate a temp regno
  const { data, error } = await supabase.rpc('generate_temp_er_regno');
  
  if (error) {
    console.error('Error generating temp regno:', error);
    throw new Error('Failed to generate temporary registration number');
  }
  
  return data as string;
};

export const useEmployerRegistration = ({ regno, mode }: UseEmployerRegistrationOptions) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ERMasterFormData>(initialERMasterFormData);
  const [owners, setOwners] = useState<EROwnerData[]>([]);
  const [locations, setLocations] = useState<ERLocationData[]>([]);
  const [notes, setNotes] = useState<ERNoteData[]>([]);
  const [commenceDates, setCommenceDates] = useState<ERCommenceData[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(mode === 'create');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing employer record
  const { data: employerRecord, isLoading: isLoadingEmployer, refetch: refetchEmployer } = useQuery({
    queryKey: ['er_master', regno],
    queryFn: async () => {
      if (!regno) return null;
      const { data, error } = await supabase
        .from('er_master')
        .select('*')
        .eq('regno', regno)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!regno && mode !== 'create',
  });

  // Fetch owners
  const { data: ownersData, isLoading: isLoadingOwners } = useQuery({
    queryKey: ['er_owner', regno],
    queryFn: async () => {
      if (!regno) return [];
      const { data, error } = await supabase
        .from('er_owner')
        .select('*')
        .eq('regno', regno);
      if (error) throw error;
      return data || [];
    },
    enabled: !!regno && mode !== 'create',
  });

  // Fetch locations
  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['er_locations', regno],
    queryFn: async () => {
      if (!regno) return [];
      const { data, error } = await supabase
        .from('er_locations')
        .select('*')
        .eq('regno', regno);
      if (error) throw error;
      return data || [];
    },
    enabled: !!regno && mode !== 'create',
  });

  // Fetch notes
  const { data: notesData, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['er_notes', regno],
    queryFn: async () => {
      if (!regno) return [];
      const { data, error } = await supabase
        .from('er_notes')
        .select('*')
        .eq('regno', regno)
        .order('note_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!regno && mode !== 'create',
  });

  // Fetch commence dates
  const { data: commenceData, isLoading: isLoadingCommence } = useQuery({
    queryKey: ['er_commence', regno],
    queryFn: async () => {
      if (!regno) return [];
      const { data, error } = await supabase
        .from('er_commence')
        .select('*')
        .eq('regno', regno)
        .order('date_commenced', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!regno && mode !== 'create',
  });

  // Load data into state
  useEffect(() => {
    if (employerRecord) {
      setFormData(employerRecord as ERMasterFormData);
      setIsNewRecord(false);
    }
  }, [employerRecord]);

  useEffect(() => {
    if (ownersData) {
      setOwners(ownersData as EROwnerData[]);
    }
  }, [ownersData]);

  useEffect(() => {
    if (locationsData) {
      setLocations(locationsData as ERLocationData[]);
    }
  }, [locationsData]);

  useEffect(() => {
    if (notesData) {
      setNotes(notesData as ERNoteData[]);
    }
  }, [notesData]);

  useEffect(() => {
    if (commenceData) {
      setCommenceDates(commenceData as ERCommenceData[]);
    }
  }, [commenceData]);

  // Helper to sanitize date fields - convert empty strings to null
  const sanitizeDateFields = (data: Record<string, any>): Record<string, any> => {
    const dateFields = [
      'registration_date', 'date_wages_first_paid', 'date_of_closure', 
      'application_date', 'date_of_entry', 'date_of_issue', 'date_modified',
      'date_verified', 'date_of_acquisition', 'date_incorporated', 're_registration_date'
    ];
    
    const sanitized = { ...data };
    dateFields.forEach(field => {
      if (sanitized[field] === '' || sanitized[field] === undefined) {
        sanitized[field] = null;
      }
    });
    return sanitized;
  };

  // Save employer to database
  const saveEmployer = useCallback(async (data: Partial<ERMasterFormData>): Promise<string | null> => {
    setIsSaving(true);
    try {
      let regnoToUse = formData.regno;

      // For new records, generate a temporary regno (ER-T00001 format)
      if (isNewRecord && !regnoToUse) {
        regnoToUse = await generateTempRegNo();
      }

      // Merge and sanitize data - convert empty date strings to null
      const mergedData = {
        ...formData,
        ...data,
        regno: regnoToUse,
        status: isNewRecord ? 'Z' : formData.status, // Ensure draft status for new records
        date_modified: new Date().toISOString(),
      };
      
      const dataToSave = sanitizeDateFields(mergedData) as typeof mergedData;

      if (isNewRecord) {
        const { error } = await supabase
          .from('er_master')
          .insert([dataToSave as any]);

        if (error) throw error;

        setFormData(prev => ({ ...prev, ...dataToSave, regno: regnoToUse }));
        setIsNewRecord(false);
        toast.success('Employer saved as draft');
        return regnoToUse;
      } else {
        const { error } = await supabase
          .from('er_master')
          .update(dataToSave)
          .eq('regno', regnoToUse);

        if (error) throw error;

        setFormData(prev => ({ ...prev, ...dataToSave }));
        toast.success('Changes saved');
        return regnoToUse;
      }
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [formData, isNewRecord]);

  // Submit for verification
  const submitForVerification = useCallback(async (): Promise<boolean> => {
    if (!formData.regno) {
      toast.error('Please save the employer first');
      return false;
    }

    try {
      const { error } = await supabase
        .from('er_master')
        .update({ 
          status: 'P',
          date_modified: new Date().toISOString(),
        })
        .eq('regno', formData.regno);

      if (error) throw error;

      setFormData(prev => ({ ...prev, status: 'P' }));
      toast.success('Submitted for verification');
      queryClient.invalidateQueries({ queryKey: ['er_master'] });
      return true;
    } catch (error: any) {
      toast.error('Failed to submit: ' + error.message);
      return false;
    }
  }, [formData.regno, queryClient]);

  // Add owner
  const addOwner = useCallback(async (owner: Omit<EROwnerData, 'regno'>): Promise<boolean> => {
    if (!formData.regno) {
      toast.error('Please save the employer first');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('er_owner')
        .insert([{ ...owner, regno: formData.regno }])
        .select()
        .single();

      if (error) throw error;

      setOwners(prev => [...prev, data as EROwnerData]);
      toast.success('Owner added');
      return true;
    } catch (error: any) {
      toast.error('Failed to add owner: ' + error.message);
      return false;
    }
  }, [formData.regno]);

  // Delete owner
  const deleteOwner = useCallback(async (ownerId: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('er_owner')
        .delete()
        .eq('owner_id', ownerId);

      if (error) throw error;

      setOwners(prev => prev.filter(o => o.owner_id !== ownerId));
      toast.success('Owner removed');
      return true;
    } catch (error: any) {
      toast.error('Failed to remove owner: ' + error.message);
      return false;
    }
  }, []);

  // Add location
  const addLocation = useCallback(async (location: Omit<ERLocationData, 'regno'>): Promise<boolean> => {
    if (!formData.regno) {
      toast.error('Please save the employer first');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('er_locations')
        .insert([{ ...location, regno: formData.regno }])
        .select()
        .single();

      if (error) throw error;

      setLocations(prev => [...prev, data as ERLocationData]);
      toast.success('Location added');
      return true;
    } catch (error: any) {
      toast.error('Failed to add location: ' + error.message);
      return false;
    }
  }, [formData.regno]);

  // Delete location
  const deleteLocation = useCallback(async (locationId: number): Promise<boolean> => {
    if (!formData.regno) return false;
    
    try {
      const { error } = await supabase
        .from('er_locations')
        .delete()
        .eq('regno', formData.regno)
        .eq('location_id', locationId);

      if (error) throw error;

      setLocations(prev => prev.filter(l => l.location_id !== locationId));
      toast.success('Location removed');
      return true;
    } catch (error: any) {
      toast.error('Failed to remove location: ' + error.message);
      return false;
    }
  }, [formData.regno]);

  // Add note
  const addNote = useCallback(async (note: string, userId: string): Promise<boolean> => {
    if (!formData.regno) {
      toast.error('Please save the employer first');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('er_notes')
        .insert([{
          regno: formData.regno,
          note_date: new Date().toISOString(),
          note,
          user_id: userId,
        }])
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data as ERNoteData, ...prev]);
      toast.success('Note added');
      return true;
    } catch (error: any) {
      toast.error('Failed to add note: ' + error.message);
      return false;
    }
  }, [formData.regno]);

  // Add commence date
  const addCommenceDate = useCallback(async (commence: Omit<ERCommenceData, 'regno' | 'commence_seq_no'>): Promise<boolean> => {
    if (!formData.regno) {
      toast.error('Please save the employer first');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('er_commence')
        .insert([{ ...commence, regno: formData.regno }])
        .select()
        .single();

      if (error) throw error;

      setCommenceDates(prev => [data as ERCommenceData, ...prev]);
      toast.success('Commence date added');
      return true;
    } catch (error: any) {
      toast.error('Failed to add commence date: ' + error.message);
      return false;
    }
  }, [formData.regno]);

  const isLoading = isLoadingEmployer || isLoadingOwners || isLoadingLocations || isLoadingNotes || isLoadingCommence;

  return {
    formData,
    setFormData,
    owners,
    locations,
    notes,
    commenceDates,
    isLoading,
    isSaving,
    isNewRecord,
    saveEmployer,
    submitForVerification,
    addOwner,
    deleteOwner,
    addLocation,
    deleteLocation,
    addNote,
    addCommenceDate,
    refetchEmployer,
  };
};

// Hook for employer list
export const useEmployerList = () => {
  const [activeTab, setActiveTab] = useState('pending');

  const PENDING_STATUSES = ['Z', 'P'];
  const REGISTERED_STATUSES = ['A', 'V'];
  const CEASED_STATUSES = ['C', 'S'];
  const EXCLUDED_STATUS = 'D';

  const getStatusesForTab = useCallback((tab: string): string[] => {
    switch (tab) {
      case 'pending':
        return PENDING_STATUSES;
      case 'registered':
        return REGISTERED_STATUSES;
      case 'ceased':
        return CEASED_STATUSES;
      default:
        return [];
    }
  }, []);

  const { data: employers, isLoading, refetch } = useQuery({
    queryKey: ['er_master_list', activeTab],
    queryFn: async () => {
      const tabStatuses = getStatusesForTab(activeTab);
      const { data, error } = await supabase
        .from('er_master')
        .select('*')
        .neq('status', EXCLUDED_STATUS)
        .in('status', tabStatuses)
        .order('date_of_entry', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ['er_master_counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('er_master')
        .select('status')
        .neq('status', EXCLUDED_STATUS);

      if (error) throw error;

      const allRecords = data || [];
      return {
        pending: allRecords.filter(r => PENDING_STATUSES.includes(r.status)).length,
        registered: allRecords.filter(r => REGISTERED_STATUSES.includes(r.status)).length,
        ceased: allRecords.filter(r => CEASED_STATUSES.includes(r.status)).length,
      };
    },
  });

  // Delete employer (soft delete)
  const deleteEmployer = async (regno: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('er_master')
        .update({ status: 'D', date_modified: new Date().toISOString() })
        .eq('regno', regno);

      if (error) throw error;

      toast.success('Employer deleted');
      refetch();
      return true;
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
      return false;
    }
  };

  // Approve employer
  const approveEmployer = async (regno: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('er_master')
        .update({ 
          status: 'A', 
          date_verified: new Date().toISOString(),
          registration_date: new Date().toISOString(),
        })
        .eq('regno', regno);

      if (error) throw error;

      toast.success('Employer approved');
      refetch();
      return true;
    } catch (error: any) {
      toast.error('Failed to approve: ' + error.message);
      return false;
    }
  };

  // Reject employer
  const rejectEmployer = async (regno: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('er_master')
        .update({ status: 'R', date_modified: new Date().toISOString() })
        .eq('regno', regno);

      if (error) throw error;

      toast.success('Employer rejected');
      refetch();
      return true;
    } catch (error: any) {
      toast.error('Failed to reject: ' + error.message);
      return false;
    }
  };

  return {
    employers: employers || [],
    counts: counts || { pending: 0, registered: 0, ceased: 0 },
    isLoading,
    activeTab,
    setActiveTab,
    refetch,
    deleteEmployer,
    approveEmployer,
    rejectEmployer,
  };
};
