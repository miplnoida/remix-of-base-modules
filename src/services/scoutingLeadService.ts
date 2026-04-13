// ============================================
// SCOUTING LEAD SERVICE - DB-BACKED
// ============================================

import { supabase } from '@/integrations/supabase/client';
import {
  ScoutingLead,
  ScoutingLeadHistory,
  ScoutingLeadStatus,
  CreateScoutingLeadRequest,
} from '@/types/weeklyPlan';

function generateLeadNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${year}-${rand}`;
}

export const scoutingLeadService = {
  // Fetch all leads with optional filters
  async getAll(filters?: {
    status?: string;
    territory?: string;
    assignedToUserId?: string;
    search?: string;
  }): Promise<ScoutingLead[]> {
    let query = supabase
      .from('ce_scouting_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }
    if (filters?.territory) {
      query = query.eq('territory', filters.territory);
    }
    if (filters?.assignedToUserId) {
      query = query.eq('assigned_to_user_id', filters.assignedToUserId);
    }
    if (filters?.search) {
      query = query.or(
        `business_name.ilike.%${filters.search}%,location_description.ilike.%${filters.search}%,lead_number.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as ScoutingLead[];
  },

  // Get single lead
  async getById(id: string): Promise<ScoutingLead | null> {
    const { data, error } = await supabase
      .from('ce_scouting_leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as ScoutingLead | null;
  },

  // Create lead
  async create(req: CreateScoutingLeadRequest): Promise<ScoutingLead> {
    const leadNumber = generateLeadNumber();
    const { data, error } = await supabase
      .from('ce_scouting_leads')
      .insert({
        lead_number: leadNumber,
        lead_type: req.lead_type,
        business_name: req.business_name || null,
        location_description: req.location_description || null,
        territory: req.territory || null,
        zone_id: req.zone_id || null,
        estimated_employees: req.estimated_employees || null,
        activity_type: req.activity_type || null,
        confidence_level: req.confidence_level || 'MEDIUM',
        source: req.source || null,
        source_details: req.source_details || null,
        reported_by: req.reported_by,
        assigned_to_user_id: req.assigned_to_user_id || null,
        gps_lat: req.gps_lat || null,
        gps_lng: req.gps_lng || null,
        created_by: req.created_by,
        updated_by: req.created_by,
        status: ScoutingLeadStatus.NEW,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ScoutingLead;
  },

  // Update lead
  async update(id: string, updates: Partial<ScoutingLead> & { updated_by: string }): Promise<ScoutingLead> {
    const { data, error } = await supabase
      .from('ce_scouting_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ScoutingLead;
  },

  // Transition status
  async transitionStatus(
    id: string,
    newStatus: string,
    userId: string,
    reason?: string
  ): Promise<ScoutingLead> {
    // The trigger fn_ce_log_scouting_status_change handles history logging
    return this.update(id, {
      status: newStatus,
      updated_by: userId,
    });
  },

  // Assign to officer
  async assign(id: string, officerUserId: string, assignedBy: string): Promise<ScoutingLead> {
    return this.update(id, {
      assigned_to_user_id: officerUserId,
      updated_by: assignedBy,
    });
  },

  // Convert to violation (link)
  async linkToViolation(id: string, violationId: string, employerId: string, userId: string): Promise<ScoutingLead> {
    return this.update(id, {
      status: ScoutingLeadStatus.CONVERTED_TO_VIOLATION,
      linked_violation_id: violationId,
      linked_employer_id: employerId,
      updated_by: userId,
    });
  },

  // Dismiss lead
  async dismiss(id: string, userId: string, reason: string): Promise<ScoutingLead> {
    return this.update(id, {
      status: ScoutingLeadStatus.DISMISSED,
      investigation_notes: reason,
      updated_by: userId,
    });
  },

  // Get history for a lead
  async getHistory(leadId: string): Promise<ScoutingLeadHistory[]> {
    const { data, error } = await supabase
      .from('ce_scouting_lead_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('changed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ScoutingLeadHistory[];
  },

  // Get summary counts by status
  async getStatusSummary(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('ce_scouting_leads')
      .select('status');
    if (error) throw error;

    const summary: Record<string, number> = {};
    for (const row of (data ?? [])) {
      const s = (row as any).status;
      summary[s] = (summary[s] || 0) + 1;
    }
    return summary;
  },
};
