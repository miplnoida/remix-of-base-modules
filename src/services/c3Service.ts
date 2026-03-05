// C3 Management Service - Supabase Operations
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserCode } from "@/hooks/useUserCode";

// Types based on the cn_c3_reported table
export type PayerType = 'ER' | 'SE' | 'VC';
export type PostingStatus = 'DFT' | 'PEN' | 'VAC' | 'REJ' | 'DEL';

const EDITABLE_STATUSES: PostingStatus[] = ['DFT', 'PEN'];

/**
 * Pre-check: verify the existing record's posting_status allows editing.
 * Throws an error if the record is not editable.
 */
async function assertC3Editable(recordId: string): Promise<void> {
  const { data, error } = await supabase
    .from('cn_c3_reported')
    .select('posting_status')
    .eq('id', recordId)
    .single();
  if (error) throw error;
  if (data && !EDITABLE_STATUSES.includes(data.posting_status as PostingStatus)) {
    throw new Error(`C3 cannot be edited when posting_status is ${data.posting_status}`);
  }
}

export interface C3Record {
  id?: string;
  payer_id: string;
  payer_type: string; // 'ER' | 'SE' | 'VC' - Using string for Supabase compatibility
  sequence_no: number;
  period: string; // Date as ISO string
  number_employed?: number | null;
  emp_ss_amt_calc?: number | null;
  emp_levy_amt_calc?: number | null;
  emp_pe_amt_calc?: number | null;
  emp_levy_penalty_amt?: number | null;
  emp_pe_penalty_amt?: number | null;
  emp_ss_fines_due?: number | null;
  total_wages?: number | null;
  date_received?: string | null;
  date_entered?: string | null;
  date_verified?: string | null;
  date_posted?: string | null;
  modified_date?: string | null;
  entered_by?: string | null;
  verified_by?: string | null;
  modified_by?: string | null;
  received_by?: string | null;
  posting_status: string; // 'DFT' | 'PEN' | 'VAC' | 'REJ' | 'DEL' - DFT=Draft, PEN=Pending, VAC=Verified/Approved, REJ=Rejected, DEL=Deleted
  nil_return?: boolean | null;
  notes?: string | null;
  payer_name?: string | null;
  payer_address?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Types based on the ip_wages table
export interface WageRecord {
  id?: string;
  ssn: string;
  payer_id: string;
  payer_type: string; // 'ER' | 'SE' | 'VC' - Using string for Supabase compatibility
  sequence_no: number;
  period: string;
  pay_period?: string | null; // 1=Monthly, 2=Bi-Weekly, 3=Weekly, 4=2-Monthly
  wages_paid1?: number | null;
  wages_paid2?: number | null;
  wages_paid3?: number | null;
  wages_paid4?: number | null;
  wages_paid5?: number | null;
  wages_paid6?: number | null; // Holiday Pay
  wages_paid7?: number | null; // Bonus Pay
  paid_code1?: string | null; // '1' if amount entered, '0' otherwise
  paid_code2?: string | null;
  paid_code3?: string | null;
  paid_code4?: string | null;
  paid_code5?: string | null;
  paid_code6?: string | null;
  paid_code7?: string | null;
  employee_name?: string | null;
  ip_ss_amt?: number | null; // Employee SS contribution
  ip_levy_amt?: number | null; // Employee Levy contribution
  ip_pe_amt?: number | null; // Employee PE contribution
  er_ss_amt?: number | null; // Employer SS contribution
  er_levy_amt?: number | null; // Employer Levy contribution
  er_ei_amt?: number | null; // Employer PE (Employment Injury)
  total_wages?: number | null;
  entered_by?: string | null;
  date_entered?: string | null;
  modified_by?: string | null;
  date_modified?: string | null;
  verified_by?: string | null;
  date_verified?: string | null;
  posting_status?: string | null; // 'DFT' | 'PEN' | 'VAC' | 'REJ' | 'DEL'
  input_seq_no?: number | null;
  c3_id?: string | null;
  is_verified?: boolean;
}

// Update is_verified for a single ip_wages record
export async function updateWageVerification(
  wageId: string, 
  isVerified: boolean,
  userCode?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { is_verified: isVerified };
    if (isVerified && userCode) {
      updateData.verified_by = userCode;
      updateData.date_verified = new Date().toISOString();
    }
    const { error } = await supabase
      .from('ip_wages')
      .update(updateData)
      .eq('id', wageId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating wage verification:', error);
    return { success: false, error: error.message };
  }
}

// Bulk verify all ip_wages rows for a given C3
export async function verifyAllWagesForC3(
  c3Id: string,
  userCode?: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const updateData: any = { 
      is_verified: true,
      verified_by: userCode || null,
      date_verified: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('ip_wages')
      .update(updateData)
      .eq('c3_id', c3Id)
      .select('id');
    if (error) throw error;
    return { success: true, count: data?.length || 0 };
  } catch (error: any) {
    console.error('Error bulk verifying wages:', error);
    return { success: false, error: error.message };
  }
}

export interface C3RecordWithWages extends C3Record {
  wages?: WageRecord[];
}

export interface C3ListFilters {
  payer_type?: 'ER' | 'SE' | 'VC';
  payer_id?: string;
  period?: string;
  period_month?: number;
  period_year?: number;
  status?: string;
  entered_by?: string;
  verified_by?: string;
  date_received_from?: string;
  date_received_to?: string;
  date_entered_from?: string;
  date_entered_to?: string;
  schedule_no?: number;
  page?: number;
  pageSize?: number;
}

// Get SSC rates for calculations
export async function getSSCRates(period: Date) {
  const { data, error } = await supabase
    .from('tb_ssc_rates')
    .select('*')
    .lte('effective_start_date', period.toISOString())
    .or(`effective_end_date.is.null,effective_end_date.gte.${period.toISOString()}`)
    .eq('is_active', true)
    .order('effective_start_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching SSC rates:', error);
    return {
      employee_ss_percentage: 5,
      employer_ss_percentage: 5,
      employee_pe_percentage: 1,
      employer_ei_percentage: 1,
      employer_levy_percentage: 3
    };
  }

  return data;
}

// Get penalty rates
export async function getPenaltyRates(penaltyType: 'SSC' | 'LEVY' | 'SEVERANCE', period: Date) {
  const { data, error } = await supabase
    .from('tb_penalty')
    .select('*')
    .eq('penalty_type', penaltyType)
    .lte('effective_start_date', period.toISOString())
    .or(`effective_end_date.is.null,effective_end_date.gte.${period.toISOString()}`)
    .eq('is_active', true)
    .order('month_number');

  if (error) {
    console.error('Error fetching penalty rates:', error);
    return [];
  }

  return data;
}

// Get self-employed contribution rate
export async function getSelfEmployedContribRate(wageCategory: number, period: Date) {
  const { data, error } = await supabase
    .from('tb_self_emp_contrib_rate')
    .select('*')
    .eq('wage_cat', wageCategory)
    .lte('effstart', period.toISOString())
    .gte('effend', period.toISOString())
    .single();

  if (error) {
    console.error('Error fetching self-employed contrib rate:', error);
    return null;
  }

  return data;
}

// Get wage categories
export async function getWageCategories() {
  const { data, error } = await supabase
    .from('c3_wage_category')
    .select('*')
    .order('weekly_income');

  if (error) {
    console.error('Error fetching wage categories:', error);
    return [];
  }

  return data;
}

// Validate employer
export async function validateEmployer(regNo: string) {
  const { data, error } = await supabase
    .from('er_master')
    .select('regno, name, maddr1, maddr2, status')
    .eq('regno', regNo)
    .eq('status', 'A')
    .single();

  if (error || !data) {
    return { isValid: false, name: '', address: '', message: 'Employer not found or not active' };
  }

  return {
    isValid: true,
    name: data.name || '',
    address: [data.maddr1, data.maddr2].filter(Boolean).join(' ').trim(),
    message: 'Employer validated successfully'
  };
}

// Validate self-employed/voluntary contributor
export async function validateContributor(ssn: string, payerType: 'SE' | 'VC') {
  const query = supabase
    .from('ip_master')
    .select('ssn, firstname, surname, resident_addr1, resident_addr2, status, vol_contrib')
    .eq('ssn', ssn)
    .eq('status', 'A');

  // For voluntary contributors, must have vol_contrib = 'Y'
  if (payerType === 'VC') {
    query.eq('vol_contrib', 'Y');
  }

  const { data, error } = await query.single();

  if (error || !data) {
    const typeLabel = payerType === 'VC' ? 'Voluntary contributor' : 'Self-employed contributor';
    return { isValid: false, name: '', address: '', message: `${typeLabel} not found or not eligible` };
  }

  return {
    isValid: true,
    name: [data.firstname, data.surname].filter(Boolean).join(' ').trim(),
    address: [data.resident_addr1, data.resident_addr2].filter(Boolean).join(' ').trim(),
    message: `${payerType === 'VC' ? 'Voluntary' : 'Self-employed'} contributor validated successfully`
  };
}

// Get next schedule number for a payer and period
export async function getNextScheduleNo(payerId: string, payerType: 'ER' | 'SE' | 'VC', period: string) {
  const { data, error } = await supabase.rpc('get_next_c3_schedule_no', {
    p_payer_id: payerId,
    p_payer_type: payerType,
    p_period: period
  });

  if (error) {
    console.error('Error getting next schedule number:', error);
    return 1;
  }

  return data || 1;
}

// Helper function to map pay period string to numeric code per spec
// 1=Monthly, 2=Bi-Weekly, 3=Weekly, 4=2-Monthly
function mapPayPeriodToCode(payPeriod: string | undefined | null): string {
  switch (payPeriod?.toLowerCase()) {
    case 'weekly': return '3';
    case 'bi-weekly': return '2';
    case 'monthly': return '1';
    case '2 monthly': case '2-monthly': return '4';
    default: return '1';
  }
}

// Helper to safely convert value to number, returning null if empty/invalid
// Per spec: "If a numeric field has no value → save NULL (not empty string)"
function toNumericOrNull(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

// Helper for paid_code: 1 = amount exists and > 0, 0 = amount missing or zero
function toPaidCode(value: number | null | undefined): string {
  return (value != null && Number(value) > 0) ? '1' : '0';
}

// Helper to normalize status to 3-character codes for ip_wages table
// ip_wages now accepts: 'DFT' (Draft), 'PEN' (Pending), 'VAC' (Verified), 'REJ' (Rejected), 'DEL' (Deleted)
function normalizeStatus(status: string | undefined | null, parentStatus?: string): string {
  // If parent status is DEL, do not overwrite - return the current record status
  if (parentStatus?.toUpperCase() === 'DEL') {
    return status?.toUpperCase() || 'DFT';
  }
  
  // Convert legacy codes to new 3-char codes
  switch (status?.toUpperCase()) {
    case 'Z': return 'DFT';
    case 'P': return 'PEN';
    case 'V': return 'VAC';
    case 'D': return 'DEL';
    case 'DFT': case 'PEN': case 'VAC': case 'REJ': case 'DEL':
      return status.toUpperCase();
    default: return 'DFT';
  }
}

// Create or update a C3 draft record for Employer (ER)
// Note: userCode parameter is expected to be user_code (5-char identifier)
export async function saveC3Draft(
  record: C3RecordWithWages & { 
    received_by?: string;
    employees?: any[];  // Employees from form 
  }, 
  userCode?: string
): Promise<{ success: boolean; data?: C3Record; error?: string }> {
  try {
    const currentDate = new Date().toISOString();
    
    // If no userCode provided, try to get the current user's code
    let effectiveUserCode = userCode;
    if (!effectiveUserCode) {
      effectiveUserCode = await getCurrentUserCode() || undefined;
    }
    
    const c3Data: any = {
      payer_id: record.payer_id,
      payer_type: record.payer_type || 'ER',
      sequence_no: record.sequence_no,
      period: record.period,
      number_employed: record.number_employed || 0,
      emp_ss_amt_calc: record.emp_ss_amt_calc || 0,
      emp_levy_amt_calc: record.emp_levy_amt_calc || 0,
      emp_pe_amt_calc: record.emp_pe_amt_calc || 0,
      emp_levy_penalty_amt: record.emp_levy_penalty_amt || 0,
      emp_pe_penalty_amt: record.emp_pe_penalty_amt || 0,
      emp_ss_fines_due: record.emp_ss_fines_due || 0,
      total_wages: record.total_wages || 0,
      date_received: record.date_received,
      received_by: record.received_by || effectiveUserCode,
      nil_return: record.nil_return || false,
      notes: record.notes,
      payer_name: record.payer_name,
      payer_address: record.payer_address,
      posting_status: 'DFT',
    };

    let c3Record: C3Record;

    if (record.id) {
      // Pre-check editability
      await assertC3Editable(record.id);
      // Update existing record
      c3Data.modified_date = currentDate;
      c3Data.modified_by = effectiveUserCode;

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .update(c3Data)
        .eq('id', record.id)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;
    } else {
      // Create new record
      c3Data.entered_by = effectiveUserCode;
      c3Data.date_entered = currentDate;

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .insert(c3Data)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;
    }

    // Handle wage records for Employer C3
    // Get employees from record.employees (from form) or record.wages (already transformed)
    const employeesData = record.employees || record.wages || [];
    
    console.log('ER save - payer_type:', record.payer_type, 'employeesData.length:', employeesData.length, 'c3_id:', c3Record.id);
    
    if (employeesData.length > 0 && record.payer_type === 'ER') {
      const parentPostingStatus = record.posting_status;
      const isUpdate = !!record.id;
      // Ensure period is valid date string (YYYY-MM-DD)
      const periodDate = record.period ? (typeof record.period === 'string' ? record.period.split('T')[0] : record.period) : null;
      if (!periodDate) {
        console.error('ER save - missing period for wage records');
        return { success: true, data: c3Record, error: 'Missing period for wage records' };
      }

      // Transform wage records per spec - one row per SSN
      const wageRecords = employeesData.map((emp: any) => {
        // Handle both transformed WageRecord and raw EmployeeData formats
        const isRawEmployee = emp.weeklyWages !== undefined;
        
        // Extract weekly wages
        let wages1: number | null, wages2: number | null, wages3: number | null;
        let wages4: number | null, wages5: number | null;
        let bonusPay: number | null, holidayPay: number | null;
        
        if (isRawEmployee) {
          // Raw EmployeeData from form - weeklyWages is [w1, w2, w3, w4, w5, bonus, holiday]
          wages1 = toNumericOrNull(emp.weeklyWages?.[0]);
          wages2 = toNumericOrNull(emp.weeklyWages?.[1]);
          wages3 = toNumericOrNull(emp.weeklyWages?.[2]);
          wages4 = toNumericOrNull(emp.weeklyWages?.[3]);
          wages5 = toNumericOrNull(emp.weeklyWages?.[4]);
          bonusPay = toNumericOrNull(emp.weeklyWages?.[5]);
          holidayPay = toNumericOrNull(emp.weeklyWages?.[6]);
        } else {
          // Already transformed WageRecord
          wages1 = toNumericOrNull(emp.wages_paid1);
          wages2 = toNumericOrNull(emp.wages_paid2);
          wages3 = toNumericOrNull(emp.wages_paid3);
          wages4 = toNumericOrNull(emp.wages_paid4);
          wages5 = toNumericOrNull(emp.wages_paid5);
          bonusPay = toNumericOrNull(emp.wages_paid7);
          holidayPay = toNumericOrNull(emp.wages_paid6);
        }
        
        // Calculate total wages
        const totalWages = (wages1 || 0) + (wages2 || 0) + (wages3 || 0) + 
                          (wages4 || 0) + (wages5 || 0) + (bonusPay || 0) + (holidayPay || 0);
        
        // Extract contributions - handle both formats
        const ipSsAmt = isRawEmployee 
          ? toNumericOrNull(emp.employeeSS || emp.socialSecurity) 
          : toNumericOrNull(emp.ip_ss_amt);
        const ipLevyAmt = isRawEmployee 
          ? toNumericOrNull(emp.employeeLevy || emp.hssdLevy) 
          : toNumericOrNull(emp.ip_levy_amt);
        const ipPeAmt = toNumericOrNull(emp.ip_pe_amt) || null; // Employee PE contribution
        
        const erSsAmt = isRawEmployee 
          ? toNumericOrNull(emp.employerSS) 
          : toNumericOrNull(emp.er_ss_amt);
        const erLevyAmt = isRawEmployee 
          ? toNumericOrNull(emp.employerLevy) 
          : toNumericOrNull(emp.er_levy_amt);
        const erEiAmt = isRawEmployee 
          ? toNumericOrNull(emp.employerSeverance) 
          : toNumericOrNull(emp.er_ei_amt);
        
        return {
          // Core identifiers - one ip_wages record per SSN per submission
          ssn: emp.ssn,
          payer_id: record.payer_id,
          payer_type: 'ER',
          sequence_no: record.sequence_no,
          period: periodDate,
          c3_id: c3Record.id,
          
          // Pay period: 1=Monthly, 2=Bi-Weekly, 3=Weekly, 4=2-Monthly
          pay_period: mapPayPeriodToCode(emp.payPeriod || emp.pay_period),
          
          // Weekly wages - NULL if no value per spec
          wages_paid1: wages1,
          wages_paid2: wages2,
          wages_paid3: wages3,
          wages_paid4: wages4,
          wages_paid5: wages5,
          wages_paid6: holidayPay, // Holiday Pay
          wages_paid7: bonusPay,  // Bonus Pay
          
          // paid_code: 1 = amount exists and > 0, 0 = amount missing or zero
          paid_code1: toPaidCode(wages1),
          paid_code2: toPaidCode(wages2),
          paid_code3: toPaidCode(wages3),
          paid_code4: toPaidCode(wages4),
          paid_code5: toPaidCode(wages5),
          paid_code6: toPaidCode(holidayPay),
          paid_code7: toPaidCode(bonusPay),
          
          employee_name: emp.name || emp.employee_name || '',
          ip_ss_amt: ipSsAmt,
          ip_levy_amt: ipLevyAmt,
          ip_pe_amt: ipPeAmt,
          er_ss_amt: erSsAmt,
          er_levy_amt: erLevyAmt,
          er_ei_amt: erEiAmt,
          total_wages: totalWages,
          entered_by: effectiveUserCode,
          date_entered: currentDate,
          modified_by: effectiveUserCode,
          date_modified: currentDate,
          input_seq_no: 0,
          verified_by: null,
          date_verified: null,
          posting_status: parentPostingStatus === 'DEL' ? 'DEL' : normalizeStatus(record.posting_status),
          is_verified: isRawEmployee ? (emp.isVerified || false) : (emp.is_verified || false),
          
          // Bonus/Holiday metadata
          bonus_date: isRawEmployee ? (emp.bonusDate || null) : (emp.bonus_date || null),
          bonus_exempt_levy: isRawEmployee ? (emp.bonusExemptLevy || false) : (emp.bonus_exempt_levy || false),
          holiday_start_date: isRawEmployee ? (emp.holidayStartDate || null) : (emp.holiday_start_date || null),
          holiday_end_date: isRawEmployee ? (emp.holidayEndDate || null) : (emp.holiday_end_date || null)
        };
      });

      // Upsert: if exists for (c3_id, ssn) → UPDATE else INSERT
      const { error: wageError, data: upsertedWages } = await supabase
        .from('ip_wages')
        .upsert(wageRecords, {
          onConflict: 'c3_id,ssn',
          ignoreDuplicates: false
        })
        .select();

      if (wageError) {
        console.error('Error saving wage records:', wageError);
        return { 
          success: true, 
          data: c3Record, 
          error: `C3 saved but wage records failed: ${wageError.message}` 
        };
      }
      console.log('Successfully upserted ER wage records:', upsertedWages?.length);
    }

    return { success: true, data: c3Record };
  } catch (error: any) {
    console.error('Error saving C3 draft:', error);
    return { success: false, error: error.message };
  }
}

// Submit a C3 record (change status from DFT to PEN)
export async function submitC3Record(c3Id: string, userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('submit_c3_record', {
      p_c3_id: c3Id,
      p_user_id: userId
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error submitting C3 record:', error);
    return { success: false, error: error.message };
  }
}

// Verify a C3 record (change status from PEN to VAC)
export async function verifyC3Record(c3Id: string, userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('verify_c3_record', {
      p_c3_id: c3Id,
      p_user_id: userId
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error verifying C3 record:', error);
    return { success: false, error: error.message };
  }
}

// Reject a C3 record (change status from PEN to REJ)
export async function rejectC3Record(c3Id: string, userId?: string, reason?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('reject_c3_record', {
      p_c3_id: c3Id,
      p_user_id: userId,
      p_reason: reason || null
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error rejecting C3 record:', error);
    return { success: false, error: error.message };
  }
}

// Get C3 records list with pagination and filters
// Uses server-side RPC for proper date_part() and ::date casting
export async function getC3Records(filters: C3ListFilters): Promise<{ data: C3Record[]; total: number; error?: string }> {
  try {
    // Convert 0-indexed month (from UI MonthYearPicker) to 1-indexed (for Postgres EXTRACT)
    const periodMonth = (filters.period_month !== undefined && filters.period_month !== null)
      ? filters.period_month + 1
      : null;

    const { data, error } = await supabase.rpc('get_c3_records_filtered', {
      p_payer_type: filters.payer_type || null,
      p_payer_id: filters.payer_id || null,
      p_status: filters.status || null,
      p_entered_by: filters.entered_by || null,
      p_verified_by: filters.verified_by || null,
      p_period_month: periodMonth,
      p_period_year: filters.period_year || null,
      p_date_received: filters.date_received_from || null,
      p_date_entered: filters.date_entered_from || null,
      p_schedule_no: filters.schedule_no || null,
      p_exclude_deleted: !filters.status, // If a specific status is selected, don't auto-exclude deleted
      p_page: filters.page || 1,
      p_page_size: filters.pageSize || 20,
    });

    if (error) throw error;

    // RPC returns { data: [...], total: N }
    const result = data as any;
    return { data: result?.data || [], total: result?.total || 0 };
  } catch (error: any) {
    console.error('Error fetching C3 records:', error);
    return { data: [], total: 0, error: error.message };
  }
}

// Get a single C3 record with wages
export async function getC3RecordWithWages(c3Id: string): Promise<{ data?: C3RecordWithWages; error?: string }> {
  try {
    const { data: c3Data, error: c3Error } = await supabase
      .from('cn_c3_reported')
      .select('*')
      .eq('id', c3Id)
      .single();

    if (c3Error) throw c3Error;

    const { data: wagesData, error: wagesError } = await supabase
      .from('ip_wages')
      .select('*')
      .eq('c3_id', c3Id)
      .order('input_seq_no');

    if (wagesError) {
      console.error('Error fetching wages:', wagesError);
    }

    return {
      data: {
        ...c3Data,
        wages: wagesData || []
      }
    };
  } catch (error: any) {
    console.error('Error fetching C3 record:', error);
    return { error: error.message };
  }
}

// Delete a C3 record (soft delete - set status to DEL)
// Note: userCode parameter is expected to be user_code (5-char identifier)
export async function deleteC3Record(c3Id: string, userCode?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('cn_c3_reported')
      .update({
        posting_status: 'DEL',
        modified_date: new Date().toISOString(),
        modified_by: userCode
      })
      .eq('id', c3Id);

    if (error) throw error;

    // Also soft delete wage records
    await supabase
      .from('ip_wages')
      .update({
        posting_status: 'DEL',
        date_modified: new Date().toISOString(),
        modified_by: userCode
      })
      .eq('c3_id', c3Id);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting C3 record:', error);
    return { success: false, error: error.message };
  }
}

// Update C3 notes
// Note: userCode parameter is expected to be user_code (5-char identifier)
export async function updateC3Notes(c3Id: string, notes: string, userCode?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('cn_c3_reported')
      .update({
        notes,
        modified_date: new Date().toISOString(),
        modified_by: userCode
      })
      .eq('id', c3Id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating C3 notes:', error);
    return { success: false, error: error.message };
  }
}

// Delete a wage record (for employers)
// Note: userCode parameter is expected to be user_code (5-char identifier)
export async function deleteWageRecord(wageId: string, userCode?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the wage record first to update parent
    const { data: wageData, error: fetchError } = await supabase
      .from('ip_wages')
      .select('c3_id, total_wages, ip_ss_amt, ip_levy_amt, ip_pe_amt, er_ss_amt, er_levy_amt, er_ei_amt')
      .eq('id', wageId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the wage record
    const { error: deleteError } = await supabase
      .from('ip_wages')
      .delete()
      .eq('id', wageId);

    if (deleteError) throw deleteError;

    // Update parent C3 record - recalculate totals
    if (wageData?.c3_id) {
      const { data: remainingWages } = await supabase
        .from('ip_wages')
        .select('*')
        .eq('c3_id', wageData.c3_id);

      // Calculate new totals
      const totals = (remainingWages || []).reduce((acc, wage) => ({
        total_wages: acc.total_wages + (wage.total_wages || 0),
        emp_ss_amt_calc: acc.emp_ss_amt_calc + (wage.ip_ss_amt || 0) + (wage.er_ss_amt || 0) + (wage.er_ei_amt || 0),
        emp_levy_amt_calc: acc.emp_levy_amt_calc + (wage.ip_levy_amt || 0) + (wage.er_levy_amt || 0),
        emp_pe_amt_calc: acc.emp_pe_amt_calc + (wage.ip_pe_amt || 0),
        count: acc.count + 1
      }), { total_wages: 0, emp_ss_amt_calc: 0, emp_levy_amt_calc: 0, emp_pe_amt_calc: 0, count: 0 });

      await supabase
        .from('cn_c3_reported')
        .update({
          total_wages: totals.total_wages,
          emp_ss_amt_calc: totals.emp_ss_amt_calc,
          emp_levy_amt_calc: totals.emp_levy_amt_calc,
          emp_pe_amt_calc: totals.emp_pe_amt_calc,
          number_employed: totals.count,
          modified_date: new Date().toISOString(),
          modified_by: userCode
        })
        .eq('id', wageData.c3_id);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting wage record:', error);
    return { success: false, error: error.message };
  }
}

// Calculate contributions for an employee
export function calculateEmployeeContributions(
  wages: number[],
  rates: {
    employee_ss_percentage: number;
    employer_ss_percentage: number;
    employee_pe_percentage: number;
    employer_ei_percentage: number;
    employer_levy_percentage: number;
  }
) {
  const totalWages = wages.reduce((sum, w) => sum + (w || 0), 0);

  const ip_ss_amt = totalWages * (rates.employee_ss_percentage / 100);
  const er_ss_amt = totalWages * (rates.employer_ss_percentage / 100);
  const ip_pe_amt = totalWages * (rates.employee_pe_percentage / 100);
  const er_ei_amt = totalWages * (rates.employer_ei_percentage / 100);
  const ip_levy_amt = totalWages * (rates.employer_levy_percentage / 100);
  const er_levy_amt = totalWages * (rates.employer_levy_percentage / 100);

  return {
    total_wages: totalWages,
    ip_ss_amt,
    er_ss_amt,
    ip_pe_amt,
    er_ei_amt,
    ip_levy_amt,
    er_levy_amt
  };
}

// Format status code to display text
export function formatStatusCode(status: string): string {
  switch (status) {
    case 'Z': return 'Draft';
    case 'P': return 'Pending';
    case 'V': return 'Verified';
    case 'D': return 'Deleted';
    default: return status;
  }
}

// Format payer type to display text
export function formatPayerType(payerType: string): string {
  switch (payerType) {
    case 'ER': return 'Employer';
    case 'SE': return 'Self Contributor';
    case 'VC': return 'Voluntary Contributor';
    default: return payerType;
  }
}

// Validate self-contributor SSN and fetch wage category from ip_self_category
export async function validateSelfContributorSSN(
  ssn: string,
  periodYear: number,
  periodMonth: number
): Promise<{
  isValid: boolean;
  name: string;
  address: string;
  wageCategory: number | null;
  message: string;
}> {
  try {
    // First, get the person's info from ip_master
    const { data: personData, error: personError } = await supabase
      .from('ip_master')
      .select('ssn, firstname, surname, resident_addr1, resident_addr2')
      .eq('ssn', ssn)
      .single();

    if (personError || !personData) {
      return {
        isValid: false,
        name: '',
        address: '',
        wageCategory: null,
        message: 'SSN not found in the system'
      };
    }

    const name = [personData.firstname, personData.surname].filter(Boolean).join(' ').trim();
    const address = [personData.resident_addr1, personData.resident_addr2].filter(Boolean).join(' ').trim();

    // Check ip_self_category for wage_category with valid period
    // Period must fall between effective_start_date and effective_end_date
    const periodDate = new Date(periodYear, periodMonth, 1);
    const periodDateStr = periodDate.toISOString();

    const { data: categoryData, error: categoryError } = await supabase
      .from('ip_self_category')
      .select('wage_category, effective_start_date, effective_end_date')
      .eq('ssn', ssn)
      .lte('effective_start_date', periodDateStr)
      .or(`effective_end_date.is.null,effective_end_date.gte.${periodDateStr}`)
      .order('effective_start_date', { ascending: false })
      .limit(1)
      .single();

    if (categoryError || !categoryData) {
      return {
        isValid: false,
        name,
        address,
        wageCategory: null,
        message: 'No valid wage category found for the selected period. Please ensure the SSN has a declared wage category that covers the selected period.'
      };
    }

    return {
      isValid: true,
      name,
      address,
      wageCategory: categoryData.wage_category,
      message: 'Self-contributor validated successfully'
    };
  } catch (error: any) {
    console.error('Error validating self-contributor SSN:', error);
    return {
      isValid: false,
      name: '',
      address: '',
      wageCategory: null,
      message: error.message
    };
  }
}

// Get person details by SSN from ip_master
export async function getPersonBySSN(ssn: string): Promise<{
  isValid: boolean;
  name: string;
  address: string;
  message: string;
}> {
  try {
    const { data, error } = await supabase
      .from('ip_master')
      .select('ssn, firstname, surname, resident_addr1, resident_addr2')
      .eq('ssn', ssn)
      .single();

    if (error || !data) {
      return {
        isValid: false,
        name: '',
        address: '',
        message: 'SSN not found in the system'
      };
    }

    return {
      isValid: true,
      name: [data.firstname, data.surname].filter(Boolean).join(' ').trim(),
      address: [data.resident_addr1, data.resident_addr2].filter(Boolean).join(' ').trim(),
      message: 'Person found'
    };
  } catch (error: any) {
    console.error('Error fetching person by SSN:', error);
    return {
      isValid: false,
      name: '',
      address: '',
      message: error.message
    };
  }
}

// Get wage category details for self-contributor with period-aware config lookup
// Matches tb_self_emp_contrib_rate by wage_cat AND month-year range overlap
export async function getWageCategoryDetails(
  wageCategory: number,
  periodYear?: number,
  periodMonth?: number // 0-indexed
): Promise<{
  weeklyWage: number;
  weeklyContribution: number;
  ssRate: number;
  penaltyRate: number | null;
  configFound: boolean;
} | null> {
  try {
    const weeklyWage = wageCategory;

    // Build query filtering by wage_cat
    let query = (supabase as any)
      .from('tb_self_emp_contrib_rate')
      .select('sep_ss_percent, sep_penalty_percent, effstart, effend')
      .eq('wage_cat', wageCategory);

    // If period provided, filter by month-year range overlap
    // C3 period is a single month-year. We need a config row whose effstart..effend range covers it.
    // We compare using first-of-month for the C3 period and check effstart <= period <= effend
    if (periodYear !== undefined && periodMonth !== undefined) {
      // Build YYYY-MM-01 for the C3 period month
      const periodDateStr = `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}-01`;
      query = query.lte('effstart', periodDateStr).gte('effend', periodDateStr);
    }

    const { data: rateData, error: rateError } = await query.limit(1);

    if (rateError) {
      console.error('Error fetching contrib rate:', rateError);
    }

    if (!rateError && rateData && rateData.length > 0) {
      const ssRate = Number(rateData[0].sep_ss_percent) || 10;
      const penaltyRate = rateData[0].sep_penalty_percent != null
        ? Number(rateData[0].sep_penalty_percent)
        : null;
      const weeklyContribution = Math.round(weeklyWage * (ssRate / 100) * 100) / 100;

      return { weeklyWage, weeklyContribution, ssRate, penaltyRate, configFound: true };
    }

    // No matching config found
    return { weeklyWage, weeklyContribution: 0, ssRate: 0, penaltyRate: null, configFound: false };
  } catch (error) {
    console.error('Error fetching wage category details:', error);
    return null;
  }
}

// Save self-contributor C3 record with wages detail to ip_wages
// Note: userCode parameter is expected to be user_code (5-char identifier)
export async function saveSelfContributorC3(
  record: C3RecordWithWages & { 
    received_by?: string;
    selectedWeeks?: boolean[];
    weeklyWage?: number;
  },
  userCode?: string
): Promise<{ success: boolean; data?: C3Record; error?: string }> {
  try {
    const currentDate = new Date().toISOString();
    
    // If no userCode provided, try to get the current user's code
    let effectiveUserCode = userCode;
    if (!effectiveUserCode) {
      effectiveUserCode = await getCurrentUserCode() || undefined;
    }
    
    const c3Data: any = {
      payer_id: record.payer_id,
      payer_type: 'SE', // Self-Employed
      sequence_no: record.sequence_no,
      period: record.period,
      number_employed: 1, // Always 1 for self-contributor
      emp_ss_amt_calc: record.emp_ss_amt_calc || 0,
      emp_levy_amt_calc: 0, // No levy for self-contributors
      emp_pe_amt_calc: 0, // No PE for self-contributors
      emp_levy_penalty_amt: 0,
      emp_pe_penalty_amt: 0,
      emp_ss_fines_due: record.emp_ss_fines_due || 0,
      total_wages: record.total_wages || 0,
      date_received: record.date_received,
      received_by: record.received_by || effectiveUserCode, // User who received the submission
      nil_return: record.nil_return || false,
      notes: record.notes,
      payer_name: record.payer_name,
      payer_address: record.payer_address,
      posting_status: 'DFT', // Always draft for save
    };

    let c3Record: C3Record;

    if (record.id) {
      // Pre-check editability
      await assertC3Editable(record.id);
      // Update existing record
      c3Data.modified_date = currentDate;
      c3Data.modified_by = effectiveUserCode;

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .update(c3Data)
        .eq('id', record.id)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;

      // Delete existing wage records for this C3
      const { error: deleteError } = await supabase.from('ip_wages').delete().eq('c3_id', record.id);
      if (deleteError) {
        console.error('Error deleting existing wage records:', deleteError);
      }
    } else {
      // Create new record
      c3Data.entered_by = effectiveUserCode;
      c3Data.date_entered = currentDate;

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .insert(c3Data)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;
    }

    // Save wage record to ip_wages (for Self-Contributor) - one row per SSN
    const selectedWeeks = record.selectedWeeks || [];
    const hasSelectedWeeks = Array.isArray(selectedWeeks) && selectedWeeks.some((w: boolean) => w === true);
    const weeklyWage = (record as any).weeklyWage;
    
    if (!record.nil_return) {
      const periodDate = record.period ? (typeof record.period === 'string' ? record.period.split('T')[0] : record.period) : null;
      if (!periodDate) {
        console.error('SE save - missing period for wage record');
        return { success: true, data: c3Record, error: 'Missing period for wage record' };
      }

      // wages_paid1..5 = Week-1 to Week-5 wages OR NULL; wages_paid6/7 = NULL per spec
      const wages1 = hasSelectedWeeks && selectedWeeks[0] ? toNumericOrNull(weeklyWage) : null;
      const wages2 = hasSelectedWeeks && selectedWeeks[1] ? toNumericOrNull(weeklyWage) : null;
      const wages3 = hasSelectedWeeks && selectedWeeks[2] ? toNumericOrNull(weeklyWage) : null;
      const wages4 = hasSelectedWeeks && selectedWeeks[3] ? toNumericOrNull(weeklyWage) : null;
      const wages5 = hasSelectedWeeks && selectedWeeks[4] ? toNumericOrNull(weeklyWage) : null;

      const wageRecord = {
        ssn: record.payer_id,
        payer_id: record.payer_id,
        payer_type: 'SE',
        sequence_no: record.sequence_no,
        period: periodDate,
        c3_id: c3Record.id,
        pay_period: '1', // Monthly for SE
        wages_paid1: wages1,
        wages_paid2: wages2,
        wages_paid3: wages3,
        wages_paid4: wages4,
        wages_paid5: wages5,
        wages_paid6: null,
        wages_paid7: null,
        paid_code1: toPaidCode(wages1),
        paid_code2: toPaidCode(wages2),
        paid_code3: toPaidCode(wages3),
        paid_code4: toPaidCode(wages4),
        paid_code5: toPaidCode(wages5),
        paid_code6: null,
        paid_code7: null,
        employee_name: record.payer_name || '',
        ip_ss_amt: null,
        ip_levy_amt: null,
        ip_pe_amt: null,
        er_ss_amt: null,
        er_levy_amt: null,
        er_ei_amt: null,
        total_wages: toNumericOrNull(record.total_wages),
        entered_by: effectiveUserCode,
        date_entered: currentDate,
        modified_by: effectiveUserCode,
        date_modified: currentDate,
        verified_by: null,
        date_verified: null,
        input_seq_no: 0,
        posting_status: record.posting_status === 'DEL' ? 'DEL' : normalizeStatus(record.posting_status)
      };

      const { error: wageError } = await supabase
        .from('ip_wages')
        .upsert([wageRecord], {
          onConflict: 'c3_id,ssn',
          ignoreDuplicates: false
        });

      if (wageError) {
        console.error('Error saving SE wage record:', wageError);
        return { success: true, data: c3Record, error: `C3 saved but wage record failed: ${wageError.message}` };
      }
      console.log('Successfully upserted SE wage record');
    }

    return { success: true, data: c3Record };
  } catch (error: any) {
    console.error('Error saving self-contributor C3:', error);
    return { success: false, error: error.message };
  }
}

// Validate voluntary contributor SSN and fetch avg_weekly_wage and contrib_amount from ip_vol_contrib
export async function validateVoluntaryContributorSSN(
  ssn: string
): Promise<{
  isValid: boolean;
  name: string;
  address: string;
  avgWeeklyWage: number;
  contribAmount: number;
  message: string;
}> {
  try {
    // First, get the person's info from ip_master
    const { data: personData, error: personError } = await supabase
      .from('ip_master')
      .select('ssn, firstname, surname, resident_addr1, resident_addr2')
      .eq('ssn', ssn)
      .single();

    if (personError || !personData) {
      return {
        isValid: false,
        name: '',
        address: '',
        avgWeeklyWage: 0,
        contribAmount: 0,
        message: 'SSN not found in the system'
      };
    }

    const name = [personData.firstname, personData.surname].filter(Boolean).join(' ').trim();
    const address = [personData.resident_addr1, personData.resident_addr2].filter(Boolean).join(' ').trim();

    // Check ip_vol_contrib for avg_weekly_wage and contrib_amt (note: column is contrib_amt not contrib_amount)
    const { data: volContribData, error: volContribError } = await supabase
      .from('ip_vol_contrib')
      .select('avg_weekly_wage, contrib_amt')
      .eq('ssn', ssn)
      .limit(1)
      .single();

    if (volContribError || !volContribData) {
      return {
        isValid: false,
        name,
        address,
        avgWeeklyWage: 0,
        contribAmount: 0,
        message: 'No voluntary contribution record found for this SSN. Please ensure the SSN has a declared avg_weekly_wage and contrib_amt in ip_vol_contrib.'
      };
    }

    if (!volContribData.avg_weekly_wage || !volContribData.contrib_amt) {
      return {
        isValid: false,
        name,
        address,
        avgWeeklyWage: 0,
        contribAmount: 0,
        message: 'Voluntary contribution record is incomplete. Both avg_weekly_wage and contrib_amt are required.'
      };
    }

    return {
      isValid: true,
      name,
      address,
      avgWeeklyWage: Number(volContribData.avg_weekly_wage) || 0,
      contribAmount: Number(volContribData.contrib_amt) || 0,
      message: 'Voluntary contributor validated successfully'
    };
  } catch (error: any) {
    console.error('Error validating voluntary contributor SSN:', error);
    return {
      isValid: false,
      name: '',
      address: '',
      avgWeeklyWage: 0,
      contribAmount: 0,
      message: error.message
    };
  }
}

// Save voluntary contributor C3 record with wages detail to ip_wages
// Note: userCode parameter is expected to be user_code (5-char identifier)
export async function saveVoluntaryContributorC3(
  record: C3RecordWithWages & { 
    received_by?: string;
    selectedWeeks?: boolean[];
    weeklyWage?: number;
  },
  userCode?: string
): Promise<{ success: boolean; data?: C3Record; error?: string }> {
  try {
    const currentDate = new Date().toISOString();
    
    // If no userCode provided, try to get the current user's code
    let effectiveUserCode = userCode;
    if (!effectiveUserCode) {
      effectiveUserCode = await getCurrentUserCode() || undefined;
    }
    
    const c3Data: any = {
      payer_id: record.payer_id,
      payer_type: 'VC', // Voluntary Contributor
      sequence_no: record.sequence_no,
      period: record.period,
      number_employed: 1, // Always 1 for voluntary contributor
      emp_ss_amt_calc: record.emp_ss_amt_calc || 0,
      emp_levy_amt_calc: 0, // No levy for voluntary contributors
      emp_pe_amt_calc: 0, // No PE for voluntary contributors
      emp_levy_penalty_amt: 0,
      emp_pe_penalty_amt: 0,
      emp_ss_fines_due: record.emp_ss_fines_due || 0,
      total_wages: record.total_wages || 0,
      date_received: record.date_received,
      received_by: record.received_by || effectiveUserCode, // User who received the submission
      nil_return: record.nil_return || false,
      notes: record.notes,
      payer_name: record.payer_name,
      payer_address: record.payer_address,
      posting_status: 'DFT', // Draft status (DFT=Draft, PEN=Pending, VAC=Verified, REJ=Rejected, DEL=Deleted)
    };

    let c3Record: C3Record;

    if (record.id) {
      // Pre-check editability
      await assertC3Editable(record.id);
      // Update existing record
      c3Data.modified_date = currentDate;
      c3Data.modified_by = effectiveUserCode;

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .update(c3Data)
        .eq('id', record.id)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;

      // Delete existing wage records for this C3
      const { error: deleteError } = await supabase.from('ip_wages').delete().eq('c3_id', record.id);
      if (deleteError) {
        console.error('Error deleting existing wage records:', deleteError);
      }
    } else {
      // Create new record
      c3Data.entered_by = effectiveUserCode;
      c3Data.date_entered = currentDate;

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .insert(c3Data)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;
    }

    // Save wage record to ip_wages (for Voluntary Contributor) - same as SE except payer_type = 'VC'
    const selectedWeeks = record.selectedWeeks || [];
    const hasSelectedWeeks = Array.isArray(selectedWeeks) && selectedWeeks.some((w: boolean) => w === true);
    const weeklyWage = (record as any).weeklyWage;
    
    if (!record.nil_return) {
      const periodDate = record.period ? (typeof record.period === 'string' ? record.period.split('T')[0] : record.period) : null;
      if (!periodDate) {
        console.error('VC save - missing period for wage record');
        return { success: true, data: c3Record, error: 'Missing period for wage record' };
      }

      const wages1 = hasSelectedWeeks && selectedWeeks[0] ? toNumericOrNull(weeklyWage) : null;
      const wages2 = hasSelectedWeeks && selectedWeeks[1] ? toNumericOrNull(weeklyWage) : null;
      const wages3 = hasSelectedWeeks && selectedWeeks[2] ? toNumericOrNull(weeklyWage) : null;
      const wages4 = hasSelectedWeeks && selectedWeeks[3] ? toNumericOrNull(weeklyWage) : null;
      const wages5 = hasSelectedWeeks && selectedWeeks[4] ? toNumericOrNull(weeklyWage) : null;

      const wageRecord = {
        ssn: record.payer_id,
        payer_id: record.payer_id,
        payer_type: 'VC',
        sequence_no: record.sequence_no,
        period: periodDate,
        c3_id: c3Record.id,
        pay_period: '1',
        wages_paid1: wages1,
        wages_paid2: wages2,
        wages_paid3: wages3,
        wages_paid4: wages4,
        wages_paid5: wages5,
        wages_paid6: null,
        wages_paid7: null,
        paid_code1: toPaidCode(wages1),
        paid_code2: toPaidCode(wages2),
        paid_code3: toPaidCode(wages3),
        paid_code4: toPaidCode(wages4),
        paid_code5: toPaidCode(wages5),
        paid_code6: null,
        paid_code7: null,
        employee_name: record.payer_name || '',
        ip_ss_amt: null,
        ip_levy_amt: null,
        ip_pe_amt: null,
        er_ss_amt: null,
        er_levy_amt: null,
        er_ei_amt: null,
        total_wages: toNumericOrNull(record.total_wages),
        entered_by: effectiveUserCode,
        date_entered: currentDate,
        modified_by: effectiveUserCode,
        date_modified: currentDate,
        verified_by: null,
        date_verified: null,
        input_seq_no: 0,
        posting_status: record.posting_status === 'DEL' ? 'DEL' : normalizeStatus(record.posting_status)
      };

      const { error: wageError } = await supabase
        .from('ip_wages')
        .upsert([wageRecord], {
          onConflict: 'c3_id,ssn',
          ignoreDuplicates: false
        });

      if (wageError) {
        console.error('Error saving VC wage record:', wageError);
        return { success: true, data: c3Record, error: `C3 saved but wage record failed: ${wageError.message}` };
      }
      console.log('Successfully upserted VC wage record');
    }

    return { success: true, data: c3Record };
  } catch (error: any) {
    console.error('Error saving voluntary contributor C3:', error);
    return { success: false, error: error.message };
  }
}

// Fetch C3 status master data from tb_c3_status
export async function getC3Statuses(): Promise<{ code: string; description: string }[]> {
  const { data, error } = await supabase
    .from('tb_c3_status')
    .select('code, description')
    .eq('isactive', true)
    .order('description');

  if (error) {
    console.error('Error fetching C3 statuses:', error);
    return [];
  }
  return data || [];
}

// Fetch active profiles for Entered By / Verified By dropdowns
export async function getActiveProfiles(): Promise<{ user_code: string; full_name: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_code, full_name')
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  return (data || []).filter(p => p.user_code && p.full_name);
}
