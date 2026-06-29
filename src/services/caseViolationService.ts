import { supabase } from '@/integrations/supabase/client';

// ============================================
// CASE-VIOLATION INTEGRATION SERVICE
// Handles auto-creation, linking, and cascade resolution
// ============================================

interface ViolationContext {
  id: string;
  violation_number: string;
  employer_id: string;
  employer_name?: string;
  territory?: string;
  priority?: string;
  total_amount?: number;
  summary?: string;
}

interface CaseLinkResult {
  success: boolean;
  caseId?: string;
  caseNumber?: string;
  action?: 'linked_existing' | 'created_new';
  error?: string;
}

interface CascadeResult {
  success: boolean;
  transitioned: number;
  skipped: number;
  errors: string[];
}

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `CASE-${year}-${hex}`;
}

class CaseViolationService {
  /**
   * Find an existing active case for the employer, or create a new one.
   * Then link the violation to it.
   */
  async findOrCreateCaseForEscalation(
    violation: ViolationContext,
    performedBy: string
  ): Promise<CaseLinkResult> {
    try {
      // 1. Check if violation is already linked to a case
      const { data: existingLink } = await supabase
        .from('ce_case_violations')
        .select('case_id')
        .eq('violation_id', violation.id)
        .maybeSingle();

      if (existingLink?.case_id) {
        return { success: true, caseId: existingLink.case_id, action: 'linked_existing' };
      }

      // 2. Find an active case for the same employer
      const { data: activeCases } = await supabase
        .from('ce_cases')
        .select('id, case_number, status')
        .eq('employer_id', violation.employer_id)
        .eq('is_deleted', false)
        .in('status', ['ACTIVE', 'ESCALATED_LEGAL', 'UNDER_REVIEW'])
        .order('opened_date', { ascending: false })
        .limit(1);

      let caseId: string;
      let caseNumber: string;
      let action: 'linked_existing' | 'created_new';

      if (activeCases && activeCases.length > 0) {
        // Link to existing case
        caseId = activeCases[0].id;
        caseNumber = activeCases[0].case_number;
        action = 'linked_existing';
      } else {
        // Create new case
        caseNumber = generateCaseNumber();
        const now = new Date().toISOString();

        const { data: newCase, error: createErr } = await supabase
          .from('ce_cases')
          .insert({
            case_number: caseNumber,
            employer_id: violation.employer_id,
            employer_name: violation.employer_name || null,
            territory: violation.territory || null,
            status: 'ACTIVE',
            priority: violation.priority || 'Medium',
            case_type: 'ESCALATION',
            summary: `Auto-created from escalated violation ${violation.violation_number}`,
            total_amount: violation.total_amount || 0,
            opened_date: now.slice(0, 10),
            created_by: performedBy,
            created_at: now,
            updated_by: performedBy,
            updated_at: now,
          } as any)
          .select('id')
          .single();

        if (createErr || !newCase) {
          return { success: false, error: `Failed to create case: ${createErr?.message}` };
        }

        caseId = newCase.id;
        action = 'created_new';

        // Log case creation in case history
        await supabase.from('ce_case_history').insert({
          case_id: caseId,
          action: 'Case Created',
          from_status: null,
          to_status: 'ACTIVE',
          notes: `Auto-created from escalated violation ${violation.violation_number}`,
          performed_by: performedBy,
          performed_at: now,
        } as any);
      }

      // 3. Create the link
      await this.linkViolationToCase(violation.id, caseId, performedBy, violation.violation_number, caseNumber);

      return { success: true, caseId, caseNumber, action };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * List active cases for an employer that a violation could be linked to.
   */
  async listActiveCasesForEmployer(employerId: string) {
    const { data, error } = await supabase
      .from('ce_cases')
      .select('id, case_number, status, priority, case_type, summary, opened_date, total_amount')
      .eq('employer_id', employerId)
      .eq('is_deleted', false)
      .in('status', ['ACTIVE', 'OPEN', 'ESCALATED_LEGAL', 'UNDER_REVIEW'])
      .order('opened_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /**
   * Create a brand-new case for the violation and link it.
   */
  async createNewCaseForViolation(
    violation: ViolationContext,
    performedBy: string
  ): Promise<CaseLinkResult> {
    try {
      const caseNumber = generateCaseNumber();
      const now = new Date().toISOString();
      const { data: newCase, error: createErr } = await supabase
        .from('ce_cases')
        .insert({
          case_number: caseNumber,
          employer_id: violation.employer_id,
          employer_name: violation.employer_name || null,
          territory: violation.territory || null,
          status: 'ACTIVE',
          priority: violation.priority || 'Medium',
          case_type: 'ESCALATION',
          summary: `Created from violation ${violation.violation_number}`,
          total_amount: violation.total_amount || 0,
          opened_date: now.slice(0, 10),
          created_by: performedBy,
          created_at: now,
          updated_by: performedBy,
          updated_at: now,
        } as any)
        .select('id')
        .single();

      if (createErr || !newCase) {
        return { success: false, error: `Failed to create case: ${createErr?.message}` };
      }

      await supabase.from('ce_case_history').insert({
        case_id: newCase.id,
        action: 'Case Created',
        from_status: null,
        to_status: 'ACTIVE',
        notes: `Created from violation ${violation.violation_number}`,
        performed_by: performedBy,
        performed_at: now,
      } as any);

      await this.linkViolationToCase(violation.id, newCase.id, performedBy, violation.violation_number, caseNumber);
      return { success: true, caseId: newCase.id, caseNumber, action: 'created_new' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Link a violation to a case with full audit trail on both sides.
   */
  async linkViolationToCase(
    violationId: string,
    caseId: string,
    linkedBy: string,
    violationNumber?: string,
    caseNumber?: string
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    // Check for existing link
    const { data: existing } = await supabase
      .from('ce_case_violations')
      .select('id')
      .eq('violation_id', violationId)
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      return { success: true }; // Already linked
    }

    // Insert link
    const { error: linkErr } = await supabase
      .from('ce_case_violations')
      .insert({
        case_id: caseId,
        violation_id: violationId,
        linked_at: now,
        linked_by: linkedBy,
      } as any);

    if (linkErr) {
      return { success: false, error: linkErr.message };
    }

    // Audit: violation history
    await supabase.from('ce_violation_history').insert({
      violation_id: violationId,
      action: 'Linked to Case',
      from_value: null,
      to_value: caseNumber || caseId,
      notes: `Violation linked to case ${caseNumber || caseId}`,
      performed_by: linkedBy,
      performed_at: now,
    } as any);

    // Audit: case history
    await supabase.from('ce_case_history').insert({
      case_id: caseId,
      action: 'Violation Linked',
      from_status: null,
      to_status: null,
      notes: `Violation ${violationNumber || violationId} linked to this case`,
      performed_by: linkedBy,
      performed_at: now,
    } as any);

    return { success: true };
  }

  /**
   * Fetch the linked case for a violation.
   */
  async getLinkedCase(violationId: string) {
    const { data } = await supabase
      .from('ce_case_violations')
      .select('case_id, linked_at, linked_by')
      .eq('violation_id', violationId)
      .limit(1)
      .maybeSingle();

    if (!data?.case_id) return null;

    const { data: caseData } = await supabase
      .from('ce_cases')
      .select('id, case_number, status, priority, employer_name, total_amount, opened_date')
      .eq('id', data.case_id)
      .single();

    return caseData ? { ...caseData, linked_at: data.linked_at, linked_by: data.linked_by } : null;
  }

  /**
   * Fetch all violations linked to a case with type info.
   */
  async getCaseViolations(caseId: string) {
    const { data: links } = await supabase
      .from('ce_case_violations')
      .select('violation_id, linked_at, linked_by')
      .eq('case_id', caseId);

    if (!links || links.length === 0) return [];

    const violationIds = links.map(l => l.violation_id).filter(Boolean);
    const { data: violations } = await supabase
      .from('ce_violations')
      .select('id, violation_number, status, priority, severity, employer_name, total_amount, period_from, created_at, ce_violation_types(code, name, category)')
      .in('id', violationIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    return (violations || []).map(v => {
      const link = links.find(l => l.violation_id === v.id);
      return { ...v, linked_at: link?.linked_at, linked_by: link?.linked_by };
    });
  }

  /**
   * Cascade-resolve all active violations linked to a case.
   * Uses the lifecycle service pattern for each transition.
   */
  async cascadeResolveCaseViolations(
    caseId: string,
    caseNumber: string,
    performedBy: string,
    reason: string
  ): Promise<CascadeResult> {
    const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'];
    const violations = await this.getCaseViolations(caseId);
    const result: CascadeResult = { success: true, transitioned: 0, skipped: 0, errors: [] };
    const now = new Date().toISOString();

    for (const v of violations) {
      if (!ACTIVE_STATUSES.includes(v.status)) {
        result.skipped++;
        continue;
      }

      // Direct lifecycle transition to RESOLVED
      const updatePayload: Record<string, unknown> = {
        status: 'RESOLVED',
        resolved_at: now,
        resolved_by: performedBy,
        resolution_notes: `Cascade-resolved via Case ${caseNumber}. ${reason}`,
        updated_by: performedBy,
      };

      const { error: updateErr } = await supabase
        .from('ce_violations')
        .update(updatePayload)
        .eq('id', v.id);

      if (updateErr) {
        result.errors.push(`${v.violation_number}: ${updateErr.message}`);
        continue;
      }

      // Write violation history
      await supabase.from('ce_violation_history').insert({
        violation_id: v.id,
        action: 'Cascade-Resolved via Case',
        from_value: v.status,
        to_value: 'RESOLVED',
        notes: `Cascade-resolved via Case ${caseNumber}. ${reason}`,
        performed_by: performedBy,
        performed_at: now,
      } as any);

      result.transitioned++;
    }

    // Log cascade in case history
    await supabase.from('ce_case_history').insert({
      case_id: caseId,
      action: 'Cascade Resolution',
      from_status: null,
      to_status: null,
      notes: `${result.transitioned} violations resolved, ${result.skipped} skipped. ${reason}`,
      performed_by: performedBy,
      performed_at: now,
    } as any);

    return result;
  }
}

export const caseViolationService = new CaseViolationService();
