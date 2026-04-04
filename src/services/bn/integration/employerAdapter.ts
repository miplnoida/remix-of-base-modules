/**
 * BN Employer Adapter — Reads from er_master for employer verification
 */
import { supabase } from '@/integrations/supabase/client';
import type { IBnEmployerAdapter, EmployerSummary, EmploymentVerification } from './contracts';

const db = supabase as any;

export const bnEmployerAdapter: IBnEmployerAdapter = {
  async lookupEmployer(regNo): Promise<EmployerSummary | null> {
    const { data, error } = await db
      .from('er_master')
      .select('reg_no, employer_name, status, address_1, industrial_code')
      .eq('reg_no', regNo.trim())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      regNo: data.reg_no,
      name: data.employer_name,
      status: data.status || 'unknown',
      address: data.address_1,
      industry: data.industrial_code,
    };
  },

  async getEmployerStatus(regNo): Promise<string> {
    const { data, error } = await db
      .from('er_master')
      .select('status')
      .eq('reg_no', regNo.trim())
      .maybeSingle();
    if (error) throw error;
    return data?.status || 'unknown';
  },

  async verifyEmployment(ssn, regNo, asOfDate): Promise<EmploymentVerification> {
    // Check ip_wages for contribution records linking this SSN to this employer
    const { data, error } = await db
      .from('ip_wages')
      .select('period, wages, weeks')
      .eq('ssn', ssn.trim())
      .eq('employer_reg_no', regNo.trim())
      .order('period', { ascending: false })
      .limit(1);

    if (error) throw error;

    const employer = await this.lookupEmployer(regNo);
    const hasRecords = data && data.length > 0;

    return {
      verified: hasRecords,
      employerRegNo: regNo,
      employerName: employer?.name || 'Unknown',
      lastContributionPeriod: hasRecords ? data[0].period : undefined,
    };
  },
};
