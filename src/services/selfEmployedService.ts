/**
 * Self-Employed Person (SEP) Service
 * Handles all database operations for the SEP module
 */
import { supabase } from '@/integrations/supabase/client';

// Types
export interface SelfEmployActivity {
  ssn: string;
  self_ref_no: string;
  activity_seq_no: string;
  activity_type: string | null;
  date_commenced: string | null;
  date_ceased: string | null;
  occupation_code: string | null;
  industrial_code: string | null;
  office_code: string | null;
  village_code: string | null;
  phone: string | null;
  fax: string | null;
  inspector_code: string | null;
  inspector_name: string | null;
  sector_code: string | null;
  arrears: string | null;
  legal_action: string | null;
  persons_employed: number | null;
  self_guide: string | null;
  self_edu: string | null;
  date_educated: string | null;
  self_maddr1: string | null;
  self_maddr2: string | null;
  self_paddr1: string | null;
  self_paddr2: string | null;
  status: string | null;
  date_of_entry: string | null;
  date_of_issue: string | null;
  date_modified: string | null;
  date_verified: string | null;
  date_of_application: string | null;
  entered_by: string | null;
  verified_by: string | null;
  userid: string | null;
}

export interface SelfEmployCategory {
  ssn: string;
  self_ref_no: string;
  activity_seq_no: string;
  effective_start_date: string;
  effective_end_date: string | null;
  wage_category: number | null;
}

export interface SelfEmployLocation {
  ssn: string;
  self_ref_no: string;
  activity_seq_no: string;
  seq_no?: number;
  location: string | null;
  activity_type: string | null;
}

export interface SelfEmployCommence {
  ssn: string;
  self_ref_no: string;
  activity_seq_no: string;
  date_commenced: string;
  date_ceased: string | null;
}

export interface SEPEligibility {
  eligible: boolean;
  reason: string;
  ip_exists: boolean;
  sep_exists: boolean;
  self_ref_no: string | null;
  ip_status: string | null;
  ip_name: string | null;
}

export interface SEPContributionRate {
  sep_ss_percent: number;
  sep_penalty_percent: number | null;
}

export interface SEPWeeksPaid {
  ssn: string;
  payer_id: string;
  payer_type: string;
  sequence_no: number;
  period: string;
  pay_period: string | null;
  paid_code1: string | null;
  paid_code2: string | null;
  paid_code3: string | null;
  paid_code4: string | null;
  paid_code5: string | null;
  paid_code6: string | null;
  sep_ss_amt: number | null;
}

export interface SEPContributionSummary {
  total_contributions: number;
  total_ss_amount: number;
  latest_period: string | null;
  earliest_period: string | null;
}

export interface SEPAuditRecord {
  audit_id: number;
  action: string;
  modifier: string | null;
  modified_date: string | null;
  status: string | null;
  activity_seq_no: string | null;
  activity_type: string | null;
  date_commenced: string | null;
  date_ceased: string | null;
}

export class SelfEmployedService {
  /**
   * Check if an insured person is eligible for SEP registration
   */
  static async checkEligibility(ssn: string): Promise<SEPEligibility> {
    const { data, error } = await supabase.rpc('check_sep_eligibility', { p_ssn: ssn });
    if (error) throw new Error(error.message);
    return data as unknown as SEPEligibility;
  }

  /**
   * Register a new self-employed person (generates SREF)
   */
  static async registerSelfEmployed(params: {
    ssn: string;
    activity_type: string;
    date_commenced: string;
    entered_by?: string;
    occupation_code?: string;
    office_code?: string;
    sector_code?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('generate_sref', {
      p_ssn: params.ssn,
      p_activity_type: params.activity_type,
      p_date_commenced: params.date_commenced,
      p_entered_by: params.entered_by || null,
      p_occupation_code: params.occupation_code || null,
      p_office_code: params.office_code || 'STK',
      p_sector_code: params.sector_code || 'O',
    });
    if (error) throw new Error(error.message);
    return data as string;
  }

  /**
   * Add a new business activity to an existing SEP
   */
  static async addActivity(params: {
    ssn: string;
    self_ref_no: string;
    activity_type: string;
    date_commenced: string;
    entered_by?: string;
    occupation_code?: string;
    office_code?: string;
    sector_code?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('add_sep_activity', {
      p_ssn: params.ssn,
      p_self_ref_no: params.self_ref_no,
      p_activity_type: params.activity_type,
      p_date_commenced: params.date_commenced,
      p_entered_by: params.entered_by || null,
      p_occupation_code: params.occupation_code || null,
      p_office_code: params.office_code || 'STK',
      p_sector_code: params.sector_code || 'O',
    });
    if (error) throw new Error(error.message);
    return data as string;
  }

  /**
   * Get all activities for a self-employed person
   */
  static async getActivities(ssn: string): Promise<SelfEmployActivity[]> {
    const { data, error } = await supabase
      .from('ip_self_employ')
      .select('*')
      .eq('ssn', ssn)
      .order('activity_seq_no', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as unknown as SelfEmployActivity[];
  }

  /**
   * Update a self-employed activity record
   */
  static async updateActivity(
    ssn: string,
    self_ref_no: string,
    activity_seq_no: string,
    updates: Partial<SelfEmployActivity>
  ): Promise<void> {
    if (!ssn || !self_ref_no || !activity_seq_no) {
      throw new Error('SSN, Self Ref No, and Activity Seq No are required for update');
    }
    const { error } = await supabase
      .from('ip_self_employ')
      .update({ ...updates, date_modified: new Date().toISOString() } as any)
      .eq('ssn', ssn)
      .eq('self_ref_no', self_ref_no)
      .eq('activity_seq_no', activity_seq_no);
    if (error) throw new Error(error.message);
  }

  /**
   * Get wage categories for an activity
   */
  static async getCategories(ssn: string, activity_seq_no?: string): Promise<SelfEmployCategory[]> {
    let query = supabase
      .from('ip_self_category')
      .select('*')
      .eq('ssn', ssn)
      .order('effective_start_date', { ascending: true });
    if (activity_seq_no) {
      query = query.eq('activity_seq_no', activity_seq_no);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as unknown as SelfEmployCategory[];
  }

  /**
   * Add a wage category
   */
  static async addCategory(category: SelfEmployCategory): Promise<void> {
    if (!category.effective_end_date && category.effective_start_date) {
      const start = new Date(category.effective_start_date);
      start.setMonth(start.getMonth() + 6);
      category.effective_end_date = start.toISOString();
    }
    const { error } = await supabase.from('ip_self_category').insert(category as any);
    if (error) throw new Error(error.message);
  }

  /**
   * Get business locations for an activity
   */
  static async getLocations(ssn: string, activity_seq_no?: string): Promise<SelfEmployLocation[]> {
    let query = supabase
      .from('ip_self_locations')
      .select('*')
      .eq('ssn', ssn)
      .order('seq_no', { ascending: true });
    if (activity_seq_no) {
      query = query.eq('activity_seq_no', activity_seq_no);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as unknown as SelfEmployLocation[];
  }

  /**
   * Add a business location
   */
  static async addLocation(location: Omit<SelfEmployLocation, 'seq_no'>): Promise<void> {
    const { error } = await supabase.from('ip_self_locations').insert(location as any);
    if (error) throw new Error(error.message);
  }

  /**
   * Delete a business location
   */
  static async deleteLocation(ssn: string, self_ref_no: string, activity_seq_no: string, seq_no: number): Promise<void> {
    const { error } = await supabase
      .from('ip_self_locations')
      .delete()
      .eq('ssn', ssn)
      .eq('self_ref_no', self_ref_no)
      .eq('activity_seq_no', activity_seq_no)
      .eq('seq_no', seq_no);
    if (error) throw new Error(error.message);
  }

  /**
   * Get commencement records
   */
  static async getCommencements(ssn: string, self_ref_no: string): Promise<SelfEmployCommence[]> {
    const { data, error } = await supabase
      .from('ip_self_commence')
      .select('*')
      .eq('ssn', ssn)
      .eq('self_ref_no', self_ref_no)
      .order('date_commenced', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as unknown as SelfEmployCommence[];
  }

  /**
   * Cease a business activity
   */
  static async ceaseActivity(
    ssn: string,
    self_ref_no: string,
    activity_seq_no: string,
    date_ceased: string,
    userid?: string
  ): Promise<void> {
    await this.updateActivity(ssn, self_ref_no, activity_seq_no, {
      date_ceased,
      userid,
    });

    const { error } = await supabase
      .from('ip_self_commence')
      .update({ date_ceased } as any)
      .eq('ssn', ssn)
      .eq('self_ref_no', self_ref_no)
      .eq('activity_seq_no', activity_seq_no)
      .is('date_ceased', null);
    if (error) throw new Error(error.message);
  }

  /**
   * Change SEP status with validated lifecycle transitions (via RPC)
   */
  static async changeStatus(
    ssn: string,
    self_ref_no: string,
    new_status: string,
    userid?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('change_sep_status', {
      p_ssn: ssn,
      p_self_ref_no: self_ref_no,
      p_new_status: new_status,
      p_userid: userid || null,
    });
    if (error) throw new Error(error.message);
  }

  /**
   * Get contribution rate for a wage category and period
   */
  static async getContributionRate(wage_category: number, period: string): Promise<SEPContributionRate | null> {
    const { data, error } = await supabase.rpc('get_sep_contribution_rate', {
      p_wage_category: wage_category,
      p_period: period,
    });
    if (error) throw new Error(error.message);
    const rows = data as unknown as SEPContributionRate[];
    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get weeks paid records for a self-employed person
   */
  static async getWeeksPaid(ssn: string, payer_id: string): Promise<SEPWeeksPaid[]> {
    const { data, error } = await supabase.rpc('get_sep_weeks_paid', {
      p_ssn: ssn,
      p_payer_id: payer_id,
    });
    if (error) throw new Error(error.message);
    return (data || []) as unknown as SEPWeeksPaid[];
  }

  /**
   * Add a weeks paid record (contribution submission)
   */
  static async addWeeksPaid(record: SEPWeeksPaid): Promise<void> {
    const { error } = await supabase.from('ip_self_weeks_paid').insert({
      ...record,
      payer_type: 'SE',
    } as any);
    if (error) throw new Error(error.message);
  }

  /**
   * Get contribution summary for a self-employed person
   */
  static async getContributionSummary(ssn: string): Promise<SEPContributionSummary | null> {
    const { data, error } = await supabase.rpc('get_sep_contribution_summary', {
      p_ssn: ssn,
    });
    if (error) throw new Error(error.message);
    const rows = data as unknown as SEPContributionSummary[];
    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get audit history for a SEP record
   */
  static async getAuditHistory(ssn: string, self_ref_no: string): Promise<SEPAuditRecord[]> {
    const { data, error } = await supabase.rpc('get_sep_audit_history', {
      p_ssn: ssn,
      p_self_ref_no: self_ref_no,
    });
    if (error) throw new Error(error.message);
    return (data || []) as unknown as SEPAuditRecord[];
  }

  /**
   * Get all contribution rates
   */
  static async getAllContributionRates(): Promise<any[]> {
    const { data, error } = await supabase
      .from('tb_self_emp_contrib_rate')
      .select('*')
      .order('wage_cat', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
}
