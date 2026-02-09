/**
 * Hook for Self-Employed Person operations
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  SelfEmployedService, 
  SelfEmployActivity, 
  SelfEmployCategory, 
  SelfEmployLocation, 
  SEPEligibility 
} from '@/services/selfEmployedService';
import { toast } from 'sonner';

export function useSelfEmployed(ssn: string | null) {
  const [eligibility, setEligibility] = useState<SEPEligibility | null>(null);
  const [activities, setActivities] = useState<SelfEmployActivity[]>([]);
  const [categories, setCategories] = useState<SelfEmployCategory[]>([]);
  const [locations, setLocations] = useState<SelfEmployLocation[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<SelfEmployActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEligibility = useCallback(async () => {
    if (!ssn) return;
    try {
      const result = await SelfEmployedService.checkEligibility(ssn);
      setEligibility(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [ssn]);

  const loadActivities = useCallback(async () => {
    if (!ssn) return;
    setLoading(true);
    try {
      const data = await SelfEmployedService.getActivities(ssn);
      setActivities(data);
      if (data.length > 0 && !selectedActivity) {
        setSelectedActivity(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ssn, selectedActivity]);

  const loadCategories = useCallback(async (activitySeqNo?: string) => {
    if (!ssn) return;
    try {
      const data = await SelfEmployedService.getCategories(ssn, activitySeqNo);
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [ssn]);

  const loadLocations = useCallback(async (activitySeqNo?: string) => {
    if (!ssn) return;
    try {
      const data = await SelfEmployedService.getLocations(ssn, activitySeqNo);
      setLocations(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, [ssn]);

  const registerSelfEmployed = useCallback(async (params: {
    activity_type: string;
    date_commenced: string;
    entered_by?: string;
    occupation_code?: string;
    office_code?: string;
    sector_code?: string;
  }) => {
    if (!ssn) return null;
    setLoading(true);
    try {
      const sref = await SelfEmployedService.registerSelfEmployed({ ssn, ...params });
      toast.success(`Self-employed registration created. SREF: ${sref}`);
      await loadActivities();
      await checkEligibility();
      return sref;
    } catch (err: any) {
      toast.error(err.message);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [ssn, loadActivities, checkEligibility]);

  const addActivity = useCallback(async (params: {
    self_ref_no: string;
    activity_type: string;
    date_commenced: string;
    entered_by?: string;
    occupation_code?: string;
    office_code?: string;
    sector_code?: string;
  }) => {
    if (!ssn) return null;
    setLoading(true);
    try {
      const seq = await SelfEmployedService.addActivity({ ssn, ...params });
      toast.success(`New activity added (Seq: ${seq})`);
      await loadActivities();
      return seq;
    } catch (err: any) {
      toast.error(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [ssn, loadActivities]);

  const updateActivity = useCallback(async (
    self_ref_no: string,
    activity_seq_no: string,
    updates: Partial<SelfEmployActivity>
  ) => {
    if (!ssn) return;
    setLoading(true);
    try {
      await SelfEmployedService.updateActivity(ssn, self_ref_no, activity_seq_no, updates);
      toast.success('Activity updated');
      await loadActivities();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [ssn, loadActivities]);

  const ceaseActivity = useCallback(async (
    self_ref_no: string,
    activity_seq_no: string,
    date_ceased: string,
    userid?: string
  ) => {
    if (!ssn) return;
    setLoading(true);
    try {
      await SelfEmployedService.ceaseActivity(ssn, self_ref_no, activity_seq_no, date_ceased, userid);
      toast.success('Activity ceased');
      await loadActivities();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [ssn, loadActivities]);

  const addCategory = useCallback(async (category: SelfEmployCategory) => {
    setLoading(true);
    try {
      await SelfEmployedService.addCategory(category);
      toast.success('Wage category added');
      await loadCategories(category.activity_seq_no);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadCategories]);

  const addLocation = useCallback(async (location: Omit<SelfEmployLocation, 'seq_no'>) => {
    setLoading(true);
    try {
      await SelfEmployedService.addLocation(location);
      toast.success('Location added');
      await loadLocations(location.activity_seq_no);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadLocations]);

  const deleteLocation = useCallback(async (
    self_ref_no: string,
    activity_seq_no: string,
    seq_no: number
  ) => {
    if (!ssn) return;
    setLoading(true);
    try {
      await SelfEmployedService.deleteLocation(ssn, self_ref_no, activity_seq_no, seq_no);
      toast.success('Location removed');
      await loadLocations(activity_seq_no);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [ssn, loadLocations]);

  // When selected activity changes, load related data
  useEffect(() => {
    if (selectedActivity) {
      loadCategories(selectedActivity.activity_seq_no);
      loadLocations(selectedActivity.activity_seq_no);
    }
  }, [selectedActivity, loadCategories, loadLocations]);

  // Initial load
  useEffect(() => {
    if (ssn) {
      checkEligibility();
      loadActivities();
    }
  }, [ssn, checkEligibility, loadActivities]);

  return {
    eligibility,
    activities,
    categories,
    locations,
    selectedActivity,
    setSelectedActivity,
    loading,
    error,
    checkEligibility,
    loadActivities,
    loadCategories,
    loadLocations,
    registerSelfEmployed,
    addActivity,
    updateActivity,
    ceaseActivity,
    addCategory,
    addLocation,
    deleteLocation,
  };
}
