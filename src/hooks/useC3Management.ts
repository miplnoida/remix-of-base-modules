// Hook for C3 Management - Supabase Integration
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getC3Records,
  getC3RecordWithWages,
  saveC3Draft,
  submitC3Record,
  verifyC3Record,
  deleteC3Record,
  updateC3Notes,
  validateEmployer,
  validateContributor,
  getNextScheduleNo,
  getSSCRates,
  getPenaltyRates,
  getWageCategories,
  C3Record,
  C3RecordWithWages,
  C3ListFilters,
  WageRecord,
} from "@/services/c3Service";

export type PayerType = 'ER' | 'SE' | 'VC';
export type PostingStatus = 'Z' | 'P' | 'V' | 'D';

// Map UI contribution type to database payer_type
export const contributionTypeToPayerType = (type: string): PayerType => {
  if (type === 'employer') return 'ER';
  if (type === 'self-employed') return 'SE';
  return 'VC';
};

// Map database payer_type to UI contribution type
export const payerTypeToContributionType = (type: string): string => {
  if (type === 'ER') return 'employer';
  if (type === 'SE') return 'self-employed';
  return 'voluntary';
};

// Map posting_status to display status
export const postingStatusToDisplayStatus = (status: string): string => {
  switch (status) {
    case 'Z': return 'Draft';
    case 'P': return 'Pending';
    case 'V': return 'Verified';
    case 'D': return 'Deleted';
    default: return status;
  }
};

// Map display status to posting_status
export const displayStatusToPostingStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'draft': return 'Z';
    case 'pending': return 'P';
    case 'verified': return 'V';
    case 'deleted': return 'D';
    default: return status;
  }
};

// Transform database record to UI format
export const transformToUIRecord = (record: C3Record) => {
  return {
    id: record.id,
    payerId: record.payer_id,
    scheduleNo: `SCH-${record.sequence_no}`,
    period: record.period ? new Date(record.period).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '',
    periodRaw: record.period,
    dateReceived: record.date_received ? new Date(record.date_received).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    enteredBy: record.entered_by || '',
    verifiedBy: record.verified_by || '',
    dateEntered: record.date_entered ? new Date(record.date_entered).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    dateVerified: record.date_verified ? new Date(record.date_verified).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    status: postingStatusToDisplayStatus(record.posting_status),
    postingStatus: record.posting_status,
    type: record.payer_type === 'ER' ? 'Employer' : record.payer_type === 'SE' ? 'Self-Employed' : 'Voluntary Contribution',
    payerType: record.payer_type,
    payerName: record.payer_name || '',
    payerAddress: record.payer_address || '',
    cnc3ReportedReceivedBy: record.received_by || '',
    cnc3ReportedModifiedDate: record.modified_date ? new Date(record.modified_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    cnc3ReportedModifiedBy: record.modified_by || '',
    amount: (record.emp_ss_amt_calc || 0) + (record.emp_levy_amt_calc || 0) + (record.emp_pe_amt_calc || 0),
    totalWages: record.total_wages || 0,
    numberOfEmployees: record.number_employed || 0,
    notes: record.notes || '',
    isVerified: record.posting_status === 'V',
    nilReturn: record.nil_return || false,
    // Contribution breakdown
    empSsAmtCalc: record.emp_ss_amt_calc || 0,
    empLevyAmtCalc: record.emp_levy_amt_calc || 0,
    empPeAmtCalc: record.emp_pe_amt_calc || 0,
    empLevyPenaltyAmt: record.emp_levy_penalty_amt || 0,
    empPePenaltyAmt: record.emp_pe_penalty_amt || 0,
    empSsFinesDue: record.emp_ss_fines_due || 0,
  };
};

// Transform UI form data to database format
export const transformToDBRecord = (
  uiData: any,
  payerType: PayerType,
  existingId?: string
): C3RecordWithWages => {
  return {
    id: existingId,
    payer_id: uiData.regNo || uiData.ssn || uiData.payerId,
    payer_type: payerType,
    sequence_no: uiData.sequence_no || 1,
    period: uiData.period || uiData.periodRaw,
    number_employed: parseInt(uiData.numberOfEmployees) || (payerType === 'ER' ? 0 : 1),
    emp_ss_amt_calc: uiData.empSsAmtCalc || 0,
    emp_levy_amt_calc: uiData.empLevyAmtCalc || 0,
    emp_pe_amt_calc: uiData.empPeAmtCalc || 0,
    emp_levy_penalty_amt: uiData.empLevyPenaltyAmt || 0,
    emp_pe_penalty_amt: uiData.empPePenaltyAmt || 0,
    emp_ss_fines_due: uiData.empSsFinesDue || 0,
    total_wages: uiData.totalWages || 0,
    date_received: uiData.dateReceived || new Date().toISOString(),
    nil_return: uiData.nilReturn || false,
    notes: uiData.notes,
    payer_name: uiData.payerName || uiData.employerName || uiData.name,
    payer_address: uiData.payerAddress || uiData.address,
    posting_status: 'Z', // Draft
    wages: uiData.wages || [],
  };
};

export interface UseC3ManagementReturn {
  // State
  records: ReturnType<typeof transformToUIRecord>[];
  loading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  error: string | null;

  // Actions
  fetchRecords: (filters?: C3ListFilters) => Promise<void>;
  refreshRecords: () => Promise<void>;
  saveDraft: (data: any, payerType: PayerType, existingId?: string) => Promise<{ success: boolean; id?: string; error?: string }>;
  submitRecord: (c3Id: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  verifyRecord: (c3Id: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  deleteRecord: (c3Id: string, userName?: string) => Promise<{ success: boolean; error?: string }>;
  saveNotes: (c3Id: string, notes: string, userName?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Validation
  validatePayer: (id: string, payerType: PayerType) => Promise<{ isValid: boolean; name: string; address: string; message: string }>;
  getScheduleNo: (payerId: string, payerType: PayerType, period: string) => Promise<number>;
  
  // Lookup data
  fetchWageCategories: () => Promise<any[]>;
  fetchSSCRates: (period: Date) => Promise<any>;
  
  // Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function useC3Management(initialPayerType?: PayerType): UseC3ManagementReturn {
  const { toast } = useToast();
  const [records, setRecords] = useState<ReturnType<typeof transformToUIRecord>[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<C3ListFilters>({
    payer_type: initialPayerType,
  });

  const fetchRecords = useCallback(async (filters?: C3ListFilters) => {
    setLoading(true);
    setError(null);
    
    const appliedFilters: C3ListFilters = {
      ...currentFilters,
      ...filters,
      page: filters?.page || currentPage,
      pageSize: filters?.pageSize || pageSize,
    };
    
    setCurrentFilters(appliedFilters);
    
    try {
      const result = await getC3Records(appliedFilters);
      
      if (result.error) {
        setError(result.error);
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        const transformedRecords = result.data.map(transformToUIRecord);
        setRecords(transformedRecords);
        setTotal(result.total);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch C3 records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentFilters, currentPage, pageSize, toast]);

  const refreshRecords = useCallback(async () => {
    await fetchRecords(currentFilters);
  }, [fetchRecords, currentFilters]);

  const saveDraft = useCallback(async (
    data: any,
    payerType: PayerType,
    existingId?: string
  ) => {
    setLoading(true);
    try {
      const dbRecord = transformToDBRecord(data, payerType, existingId);
      
      // Get next schedule number if new record
      if (!existingId) {
        const scheduleNo = await getNextScheduleNo(
          dbRecord.payer_id,
          payerType,
          dbRecord.period
        );
        dbRecord.sequence_no = scheduleNo;
      }
      
      const result = await saveC3Draft(dbRecord, data.enteredBy);
      
      if (result.success && result.data) {
        toast({
          title: "Draft Saved",
          description: `C3 record has been saved as draft.`,
        });
        await refreshRecords();
        return { success: true, id: result.data.id };
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save draft",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [refreshRecords, toast]);

  const submitRecord = useCallback(async (c3Id: string, userId?: string) => {
    setLoading(true);
    try {
      const result = await submitC3Record(c3Id, userId);
      
      if (result.success) {
        toast({
          title: "Record Submitted",
          description: "C3 record has been submitted for verification.",
        });
        await refreshRecords();
        return { success: true };
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit record",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [refreshRecords, toast]);

  const verifyRecord = useCallback(async (c3Id: string, userId?: string) => {
    setLoading(true);
    try {
      const result = await verifyC3Record(c3Id, userId);
      
      if (result.success) {
        toast({
          title: "Record Verified",
          description: "C3 record has been verified successfully.",
        });
        await refreshRecords();
        return { success: true };
      } else {
        toast({
          title: "Verification Failed",
          description: result.error || "Failed to verify record",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [refreshRecords, toast]);

  const deleteRecord = useCallback(async (c3Id: string, userName?: string) => {
    setLoading(true);
    try {
      const result = await deleteC3Record(c3Id, userName);
      
      if (result.success) {
        toast({
          title: "Record Deleted",
          description: "C3 record has been deleted.",
        });
        await refreshRecords();
        return { success: true };
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete record",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [refreshRecords, toast]);

  const saveNotes = useCallback(async (c3Id: string, notes: string, userName?: string) => {
    try {
      const result = await updateC3Notes(c3Id, notes, userName);
      
      if (result.success) {
        toast({
          title: "Notes Saved",
          description: "C3 notes have been saved.",
        });
        await refreshRecords();
        return { success: true };
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save notes",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  }, [refreshRecords, toast]);

  const validatePayer = useCallback(async (id: string, payerType: PayerType) => {
    if (payerType === 'ER') {
      return await validateEmployer(id);
    } else {
      return await validateContributor(id, payerType as 'SE' | 'VC');
    }
  }, []);

  const getScheduleNo = useCallback(async (payerId: string, payerType: PayerType, period: string) => {
    return await getNextScheduleNo(payerId, payerType, period);
  }, []);

  const fetchWageCategories = useCallback(async () => {
    return await getWageCategories();
  }, []);

  const fetchSSCRates = useCallback(async (period: Date) => {
    return await getSSCRates(period);
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const setPageSizeHandler = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  return {
    records,
    loading,
    total,
    currentPage,
    pageSize,
    error,
    fetchRecords,
    refreshRecords,
    saveDraft,
    submitRecord,
    verifyRecord,
    deleteRecord,
    saveNotes,
    validatePayer,
    getScheduleNo,
    fetchWageCategories,
    fetchSSCRates,
    setPage,
    setPageSize: setPageSizeHandler,
  };
}
