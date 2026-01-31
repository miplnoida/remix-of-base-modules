// C3 Management Service - Supabase Operations
import { supabase } from "@/integrations/supabase/client";

// Types based on the cn_c3_reported table
export type PayerType = 'ER' | 'SE' | 'VC';
export type PostingStatus = 'DFT' | 'PEN' | 'VAC' | 'REJ' | 'DEL';

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
  pay_period?: string | null;
  wages_paid1?: number | null;
  wages_paid2?: number | null;
  wages_paid3?: number | null;
  wages_paid4?: number | null;
  wages_paid5?: number | null;
  wages_paid6?: number | null;
  wages_paid7?: number | null;
  paid_code1?: string | null;
  paid_code2?: string | null;
  paid_code3?: string | null;
  paid_code4?: string | null;
  paid_code5?: string | null;
  paid_code6?: string | null;
  paid_code7?: string | null;
  employee_name?: string | null;
  ip_ss_amt?: number | null;
  ip_levy_amt?: number | null;
  ip_pe_amt?: number | null;
  er_ss_amt?: number | null;
  er_levy_amt?: number | null;
  er_ei_amt?: number | null;
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
}

export interface C3RecordWithWages extends C3Record {
  wages?: WageRecord[];
}

export interface C3ListFilters {
  payer_type?: 'ER' | 'SE' | 'VC';
  payer_id?: string;
  period?: string;
  status?: string;
  entered_by?: string;
  verified_by?: string;
  date_received_from?: string;
  date_received_to?: string;
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
    .select('ssn, first_name, last_name, resident_addr1, resident_addr2, status, vol_contrib')
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
    name: [data.first_name, data.last_name].filter(Boolean).join(' ').trim(),
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

// Create or update a C3 draft record
export async function saveC3Draft(record: C3RecordWithWages, userName?: string): Promise<{ success: boolean; data?: C3Record; error?: string }> {
  try {
    const c3Data: any = {
      payer_id: record.payer_id,
      payer_type: record.payer_type,
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
      received_by: record.received_by,
      nil_return: record.nil_return || false,
      notes: record.notes,
      payer_name: record.payer_name,
      payer_address: record.payer_address,
      posting_status: 'DFT', // Always draft for save draft
    };

    let c3Record: C3Record;

    if (record.id) {
      // Update existing record
      c3Data.modified_date = new Date().toISOString();
      c3Data.modified_by = userName;

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
      c3Data.entered_by = userName;
      c3Data.date_entered = new Date().toISOString();

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .insert(c3Data)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;
    }

    // Handle wage records
    if (record.wages && record.wages.length > 0) {
      // Delete existing wage records for this C3
      if (record.id) {
        await supabase.from('ip_wages').delete().eq('c3_id', record.id);
      }

      // Insert new wage records
      const wageRecords = record.wages.map((wage, index) => ({
        ...wage,
        c3_id: c3Record.id,
        payer_id: record.payer_id,
        payer_type: record.payer_type,
        sequence_no: record.sequence_no,
        period: record.period,
        posting_status: 'DFT',
        input_seq_no: index + 1,
        entered_by: userName,
        date_entered: new Date().toISOString()
      }));

      const { error: wageError } = await supabase
        .from('ip_wages')
        .insert(wageRecords);

      if (wageError) {
        console.error('Error saving wage records:', wageError);
      }
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
export async function getC3Records(filters: C3ListFilters): Promise<{ data: C3Record[]; total: number; error?: string }> {
  try {
    let query = supabase
      .from('cn_c3_reported')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.payer_type) {
      query = query.eq('payer_type', filters.payer_type);
    }

    if (filters.payer_id) {
      query = query.ilike('payer_id', `%${filters.payer_id}%`);
    }

    if (filters.status) {
      query = query.eq('posting_status', filters.status);
    } else {
      // Exclude deleted records by default (both new and legacy codes)
      query = query.not('posting_status', 'in', '("DEL","D")');
    }

    if (filters.entered_by) {
      query = query.ilike('entered_by', `%${filters.entered_by}%`);
    }

    if (filters.verified_by) {
      query = query.ilike('verified_by', `%${filters.verified_by}%`);
    }

    if (filters.period) {
      query = query.eq('period', filters.period);
    }

    if (filters.date_received_from) {
      query = query.gte('date_received', filters.date_received_from);
    }

    if (filters.date_received_to) {
      query = query.lte('date_received', filters.date_received_to);
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    query = query
      .order('period', { ascending: false })
      .order('date_entered', { ascending: false })
      .range(start, end);

    const { data, count, error } = await query;

    if (error) throw error;

    return { data: data || [], total: count || 0 };
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
export async function deleteC3Record(c3Id: string, userName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('cn_c3_reported')
      .update({
        posting_status: 'DEL',
        modified_date: new Date().toISOString(),
        modified_by: userName
      })
      .eq('id', c3Id);

    if (error) throw error;

    // Also soft delete wage records
    await supabase
      .from('ip_wages')
      .update({
        posting_status: 'DEL',
        date_modified: new Date().toISOString(),
        modified_by: userName
      })
      .eq('c3_id', c3Id);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting C3 record:', error);
    return { success: false, error: error.message };
  }
}

// Update C3 notes
export async function updateC3Notes(c3Id: string, notes: string, userName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('cn_c3_reported')
      .update({
        notes,
        modified_date: new Date().toISOString(),
        modified_by: userName
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
export async function deleteWageRecord(wageId: string, userName?: string): Promise<{ success: boolean; error?: string }> {
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
          modified_by: userName
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
      .select('ssn, first_name, last_name, resident_address_1, resident_address_2')
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

    const name = [personData.first_name, personData.last_name].filter(Boolean).join(' ').trim();
    const address = [personData.resident_address_1, personData.resident_address_2].filter(Boolean).join(' ').trim();

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
      .select('ssn, first_name, last_name, resident_address_1, resident_address_2')
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
      name: [data.first_name, data.last_name].filter(Boolean).join(' ').trim(),
      address: [data.resident_address_1, data.resident_address_2].filter(Boolean).join(' ').trim(),
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

// Get wage category details from c3_wage_category table
export async function getWageCategoryDetails(categoryId: number): Promise<{
  weeklyWage: number;
  weeklyContribution: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('c3_wage_category')
      .select('weekly_income, weekly_contribution')
      .eq('category_id', categoryId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      weeklyWage: data.weekly_income || 0,
      weeklyContribution: data.weekly_contribution || 0
    };
  } catch (error) {
    console.error('Error fetching wage category details:', error);
    return null;
  }
}

// Save self-contributor C3 record
export async function saveSelfContributorC3(
  record: C3RecordWithWages,
  userName?: string
): Promise<{ success: boolean; data?: C3Record; error?: string }> {
  try {
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
      nil_return: record.nil_return || false,
      notes: record.notes,
      payer_name: record.payer_name,
      payer_address: record.payer_address,
      posting_status: 'DFT', // Always draft for save
    };

    let c3Record: C3Record;

    if (record.id) {
      // Update existing record
      c3Data.modified_date = new Date().toISOString();
      c3Data.modified_by = userName;

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
      c3Data.entered_by = userName;
      c3Data.date_entered = new Date().toISOString();

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .insert(c3Data)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;
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
      .select('ssn, first_name, last_name, resident_address_1, resident_address_2')
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

    const name = [personData.first_name, personData.last_name].filter(Boolean).join(' ').trim();
    const address = [personData.resident_address_1, personData.resident_address_2].filter(Boolean).join(' ').trim();

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

// Save voluntary contributor C3 record
export async function saveVoluntaryContributorC3(
  record: C3RecordWithWages,
  userName?: string
): Promise<{ success: boolean; data?: C3Record; error?: string }> {
  try {
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
      nil_return: record.nil_return || false,
      notes: record.notes,
      payer_name: record.payer_name,
      payer_address: record.payer_address,
      posting_status: 'DFT', // Always draft for save
    };

    let c3Record: C3Record;

    if (record.id) {
      // Update existing record
      c3Data.modified_date = new Date().toISOString();
      c3Data.modified_by = userName;

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
      c3Data.entered_by = userName;
      c3Data.date_entered = new Date().toISOString();

      const { data, error } = await supabase
        .from('cn_c3_reported')
        .insert(c3Data)
        .select()
        .single();

      if (error) throw error;
      c3Record = data;
    }

    return { success: true, data: c3Record };
  } catch (error: any) {
    console.error('Error saving voluntary contributor C3:', error);
    return { success: false, error: error.message };
  }
}
