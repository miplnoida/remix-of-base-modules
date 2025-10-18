import { supabase } from "@/integrations/supabase/client";

export const bemaService = {
  // Registrations
  async getRegistrations(filters?: any) {
    let query = supabase
      .from('bema_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.type) query = query.eq('registration_type', filters.type);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createRegistration(registration: any) {
    const { data, error } = await supabase
      .from('bema_registrations')
      .insert(registration)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // C3 Submissions
  async getC3Submissions(filters?: any) {
    let query = supabase
      .from('bema_c3_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.period) query = query.eq('filing_period', filters.period);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createC3Submission(submission: any) {
    const { data, error } = await supabase
      .from('bema_c3_submissions')
      .insert(submission)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Arrears
  async getArrears(filters?: any) {
    let query = supabase
      .from('bema_arrears_ledger')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.escalated) query = query.eq('escalated_to_legal', filters.escalated);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Payment Plans
  async getPaymentPlans(filters?: any) {
    let query = supabase
      .from('bema_payment_plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.status) query = query.eq('status', filters.status);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createPaymentPlan(plan: any) {
    const { data, error } = await supabase
      .from('bema_payment_plans')
      .insert(plan)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Audit Cases
  async getAuditCases(filters?: any) {
    let query = supabase
      .from('bema_audit_cases')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.type) query = query.eq('audit_type', filters.type);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createAuditCase(auditCase: any) {
    const { data, error } = await supabase
      .from('bema_audit_cases')
      .insert(auditCase)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Contributors
  async getContributors(filters?: any) {
    let query = supabase
      .from('bema_contributors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.type) query = query.eq('contributor_type', filters.type);
    if (filters?.active !== undefined) query = query.eq('active', filters.active);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Waivers
  async getWaivers(filters?: any) {
    let query = supabase
      .from('bema_waivers')
      .select('*')
      .order('requested_at', { ascending: false });
    
    if (filters?.status) query = query.eq('status', filters.status);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createWaiver(waiver: any) {
    const { data, error } = await supabase
      .from('bema_waivers')
      .insert(waiver)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Zones
  async getZones() {
    const { data, error } = await supabase
      .from('bema_zones')
      .select('*')
      .order('zone_name');
    
    if (error) throw error;
    return data;
  },

  // Activity Log
  async logActivity(activity: any) {
    const { data, error } = await supabase
      .from('bema_activity_log')
      .insert(activity)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Dashboard Stats
  async getDashboardStats() {
    const [registrations, c3Filed, arrears, audits] = await Promise.all([
      supabase.from('bema_registrations').select('count').eq('status', 'pending').single(),
      supabase.from('bema_c3_submissions').select('count').eq('status', 'posted').single(),
      supabase.from('bema_arrears_ledger').select('outstanding_balance'),
      supabase.from('bema_audit_cases').select('count').eq('status', 'assigned').single(),
    ]);

    return {
      pendingRegistrations: registrations.data?.count || 0,
      c3Filed: c3Filed.data?.count || 0,
      totalArrears: arrears.data?.reduce((sum, row) => sum + (row.outstanding_balance || 0), 0) || 0,
      openAudits: audits.data?.count || 0,
    };
  },
};
