// Hook for C3 Management - Supabase Integration
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getC3Records,
  getC3RecordWithWages,
  saveC3Draft,
  submitC3Record,
  verifyC3Record,
  rejectC3Record,
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
export type PostingStatus = 'DFT' | 'PEN' | 'VAC' | 'REJ' | 'DEL';

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

// Map posting_status to display status (supports both new and legacy codes)
export const postingStatusToDisplayStatus = (status: string): string => {
  switch (status) {
    case 'DFT': case 'Z': return 'Draft';
    case 'PEN': case 'P': return 'Pending';
    case 'VAC': case 'V': return 'Verified';
    case 'REJ': return 'Rejected';
    case 'DEL': case 'D': return 'Deleted';
    default: return status;
  }
};

// Map display status to posting_status (uses new codes)
export const displayStatusToPostingStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'draft': return 'DFT';
    case 'pending': return 'PEN';
    case 'verified': case 'approved': return 'VAC';
    case 'rejected': return 'REJ';
    case 'deleted': return 'DEL';
    default: return status;
  }
};

// Transform database record to UI format
export const transformToUIRecord = (record: C3Record) => {
  // Parse period as date-only (no timezone shift) using split to get YYYY-MM-DD parts
  const periodDisplay = (() => {
    if (!record.period) return '';
    const dateStr = typeof record.period === 'string' ? record.period.split('T')[0] : String(record.period);
    const [year, month] = dateStr.split('-').map(Number);
    if (!year || !month) return '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${year}`;
  })();

  return {
    id: record.id,
    payerId: record.payer_id,
    scheduleNo: `SCH-${record.sequence_no}`,
    period: periodDisplay,
    periodRaw: record.period,
    dateReceived: record.date_received ? new Date(record.date_received).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    dateReceivedRaw: record.date_received || '', // Raw ISO value for date inputs
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
    isVerified: record.posting_status === 'VAC' || record.posting_status === 'V',
    isRejected: record.posting_status === 'REJ',
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

// Transform wage record from ip_wages to employee data format for Employer C3 form
export const transformWageToEmployee = (wage: WageRecord): any => {
  // Map pay_period code back to string
  const mapPayPeriodCodeToString = (code: string | null): string => {
    switch (code) {
      case '1': return 'Monthly';
      case '2': return 'Bi-Weekly';
      case '3': return 'Weekly';
      case '4': return '2 Monthly';
      default: return 'Monthly';
    }
  };

  // Build weekly wages array [w1, w2, w3, w4, w5, bonus, holiday]
  const weeklyWages = [
    wage.wages_paid1 || 0,
    wage.wages_paid2 || 0,
    wage.wages_paid3 || 0,
    wage.wages_paid4 || 0,
    wage.wages_paid5 || 0,
    wage.wages_paid7 || 0, // Bonus (wages_paid7 = Bonus)
    wage.wages_paid6 || 0, // Holiday (wages_paid6 = Holiday)
  ];

  // Build days (checkboxes) from paid_code1..7: '1' = checked, '0' = unchecked
  // Use String() to handle both numeric (1) and string ('1') values from database
  const days = [
    String(wage.paid_code1) === '1',
    String(wage.paid_code2) === '1',
    String(wage.paid_code3) === '1',
    String(wage.paid_code4) === '1',
    String(wage.paid_code5) === '1',
    String(wage.paid_code7) === '1', // Bonus (paid_code7 = Bonus)
    String(wage.paid_code6) === '1', // Holiday (paid_code6 = Holiday)
  ];

  return {
    id: wage.id,
    ssn: wage.ssn,
    name: wage.employee_name || '',
    payPeriod: mapPayPeriodCodeToString(wage.pay_period),
    weeklyWages,
    days,
    totalWages: wage.total_wages || 0,
    periodGross: wage.total_wages || 0,
    isVerified: wage.is_verified || false,
    // Employee contributions
    employeeSS: wage.ip_ss_amt || 0,
    socialSecurity: wage.ip_ss_amt || 0,
    employeeLevy: wage.ip_levy_amt || 0,
    hssdLevy: wage.ip_levy_amt || 0,
    // Employer contributions  
    employerSS: wage.er_ss_amt || 0,
    employerLevy: wage.er_levy_amt || 0,
    employerSeverance: wage.er_ei_amt || 0,
    // Bonus/Holiday metadata
    bonusDate: (wage as any).bonus_date || '',
    bonusExemptLevy: (wage as any).bonus_exempt_levy || false,
    holidayStartDate: (wage as any).holiday_start_date || '',
    holidayEndDate: (wage as any).holiday_end_date || '',
    // Other payments will be attached separately
    otherPayments: [],
  };
};

// Transform C3 record with wages to full UI format including employees
export const transformToUIRecordWithEmployees = (record: C3RecordWithWages) => {
  const baseRecord = transformToUIRecord(record);
  
  // Transform wages to employees format
  const employees = (record.wages || []).map(transformWageToEmployee);

  // Attach persisted other payments to each employee by SSN
  if (record.otherPayments && record.otherPayments.length > 0) {
    const paymentsBySSN = new Map<string, any[]>();
    for (const op of record.otherPayments) {
      const ssn = op.ssn;
      if (!paymentsBySSN.has(ssn)) paymentsBySSN.set(ssn, []);
      paymentsBySSN.get(ssn)!.push({
        id: op.id,
        income_code_id: op.income_code_id,
        income_code: op.tb_income_codes?.code || '',
        income_description: op.tb_income_codes?.description || '',
        amount: Number(op.amount) || 0,
        employee_ss: Number(op.employee_ss) || 0,
        employee_levy: Number(op.employee_levy) || 0,
        employer_ss: Number(op.employer_ss) || 0,
        employer_eib: Number(op.employer_eib) || 0,
        employer_levy: Number(op.employer_levy) || 0,
        employer_severance: Number(op.employer_severance) || 0,
        policy_id: op.policy_id,
        policy_type: op.policy_type,
        date_entry_mode: op.date_entry_mode,
      });
    }
    for (const emp of employees) {
      const empPayments = paymentsBySSN.get(emp.ssn);
      if (empPayments) {
        emp.otherPayments = empPayments;
      }
    }
  }
  
  return {
    ...baseRecord,
    employees,
    // Also include raw data for reference
    received_by: record.received_by,
    sequence_no: record.sequence_no,
  };
};

// Transform employee data from form to wage record format for ip_wages table
// Uses the specification provided:
// - pay_period: 1=Monthly, 2=Bi-Weekly, 3=Weekly, 4=2-Monthly
// - wages_paid1-5: Weekly wages, wages_paid6: Holiday, wages_paid7: Bonus
// - paid_code1-7: '1' if amount entered, '0' otherwise
const transformEmployeeToWageRecord = (employee: any, periodStr: string): WageRecord => {
  // Map pay_period string to numeric code
  const mapPayPeriodToCode = (payPeriod: string): string => {
    switch (payPeriod?.toLowerCase()) {
      case 'weekly': return '3';
      case 'bi-weekly': return '2';
      case 'monthly': return '1';
      case '2 monthly': case '2-monthly': return '4';
      default: return '1';
    }
  };

  // Extract weekly wages
  const wages1 = employee.weeklyWages?.[0] || 0;
  const wages2 = employee.weeklyWages?.[1] || 0;
  const wages3 = employee.weeklyWages?.[2] || 0;
  const wages4 = employee.weeklyWages?.[3] || 0;
  const wages5 = employee.weeklyWages?.[4] || 0;
  const bonusPay = employee.weeklyWages?.[5] || 0; // Bonus pay
  const holidayPay = employee.weeklyWages?.[6] || 0; // Holiday pay

  // Calculate total wages
  const totalWages = employee.totalWages || employee.periodGross || 
    (wages1 + wages2 + wages3 + wages4 + wages5 + bonusPay + holidayPay);

  return {
    ssn: employee.ssn,
    payer_id: '', // Will be set by caller
    payer_type: 'ER',
    sequence_no: 0, // Will be set by caller
    period: periodStr,
    pay_period: mapPayPeriodToCode(employee.payPeriod || 'Monthly'),
    
    // Weekly wages
    wages_paid1: wages1 || null,
    wages_paid2: wages2 || null,
    wages_paid3: wages3 || null,
    wages_paid4: wages4 || null,
    wages_paid5: wages5 || null,
    wages_paid6: holidayPay || null, // Holiday pay
    wages_paid7: bonusPay || null, // Bonus pay
    
    // Paid codes
    paid_code1: wages1 > 0 ? '1' : '0',
    paid_code2: wages2 > 0 ? '1' : '0',
    paid_code3: wages3 > 0 ? '1' : '0',
    paid_code4: wages4 > 0 ? '1' : '0',
    paid_code5: wages5 > 0 ? '1' : '0',
    paid_code6: holidayPay > 0 ? '1' : '0',
    paid_code7: bonusPay > 0 ? '1' : '0',
    
    employee_name: employee.name,
    
    // Employee contributions
    ip_ss_amt: employee.employeeSS || employee.socialSecurity || 0,
    ip_levy_amt: employee.employeeLevy || employee.hssdLevy || 0,
    ip_pe_amt: 0, // Employee pension/severance contribution
    
    // Employer contributions
    er_ss_amt: employee.employerSS || 0,
    er_levy_amt: employee.employerLevy || 0,
    er_ei_amt: employee.employerSeverance || 0, // Employer severance/employment injury
    
    total_wages: totalWages,
    posting_status: 'DFT',
    input_seq_no: 0,
  };
};

// Transform UI form data to database format
export const transformToDBRecord = (
  uiData: any,
  payerType: PayerType,
  existingId?: string
): C3RecordWithWages & { employees?: any[] } => {
  const periodStr = uiData.period || uiData.periodRaw || '';
  
  // For Employer C3, pass through the employees array directly
  // The saveC3Draft function will handle the transformation to ip_wages format
  const employees = uiData.employees || [];
  
  // Also support already-transformed wages (for backward compatibility)
  let wages: WageRecord[] = [];
  if (uiData.wages && Array.isArray(uiData.wages)) {
    wages = uiData.wages;
  }
  
  // Parse schedule number - it may come as string "1" or "SCH-1" format
  let scheduleNo = 1;
  if (uiData.sequence_no) {
    scheduleNo = typeof uiData.sequence_no === 'number' ? uiData.sequence_no : parseInt(uiData.sequence_no) || 1;
  } else if (uiData.schedule) {
    // Handle "SCH-1" or just "1" format
    const scheduleStr = String(uiData.schedule);
    const match = scheduleStr.match(/(\d+)/);
    scheduleNo = match ? parseInt(match[1]) || 1 : 1;
  }
  
  return {
    id: existingId,
    payer_id: uiData.regNo || uiData.ssn || uiData.payerId || uiData.employerId,
    payer_type: payerType,
    sequence_no: scheduleNo,
    period: periodStr,
    number_employed: parseInt(uiData.numberOfEmployees) || (payerType === 'ER' ? employees.length : 1),
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
    posting_status: 'DFT', // Draft (new code)
    received_by: uiData.received_by || uiData.receivedBy,
    // Pass employees array directly - saveC3Draft will transform to ip_wages format
    employees,
    wages,
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
  getRecordWithWages: (c3Id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  saveDraft: (data: any, payerType: PayerType, existingId?: string) => Promise<{ success: boolean; id?: string; error?: string }>;
  submitRecord: (c3Id: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  verifyRecord: (c3Id: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  rejectRecord: (c3Id: string, userId?: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
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

  // Fetch a single C3 record with its associated wage records
  const getRecordWithWages = useCallback(async (c3Id: string) => {
    try {
      const result = await getC3RecordWithWages(c3Id);
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      if (result.data) {
        // Transform to UI format with employees
        const transformed = transformToUIRecordWithEmployees(result.data);
        return { success: true, data: transformed };
      }
      
      return { success: false, error: 'Record not found' };
    } catch (err: any) {
      console.error('Error fetching C3 record with wages:', err);
      return { success: false, error: err.message };
    }
  }, []);

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
      
      // Use received_by from the record as the userCode for audit fields
      const userCode = dbRecord.received_by || data.receivedBy || data.enteredBy;
      const result = await saveC3Draft(dbRecord, userCode);
      
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

  const rejectRecord = useCallback(async (c3Id: string, userId?: string, reason?: string) => {
    setLoading(true);
    try {
      const result = await rejectC3Record(c3Id, userId, reason);
      
      if (result.success) {
        toast({
          title: "Record Rejected",
          description: "C3 record has been rejected.",
        });
        await refreshRecords();
        return { success: true };
      } else {
        toast({
          title: "Rejection Failed",
          description: result.error || "Failed to reject record",
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
    getRecordWithWages,
    saveDraft,
    submitRecord,
    verifyRecord,
    rejectRecord,
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
