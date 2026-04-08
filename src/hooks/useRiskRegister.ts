import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditFields } from '@/hooks/useAuditTrail';

export const RISK_CATEGORIES = ['Operational', 'Financial', 'Compliance', 'IT', 'Strategic', 'Reputational'] as const;
export const RISK_STATUSES = ['Open', 'Mitigating', 'Under Review', 'Closed', 'Accepted'] as const;
export const CONTROL_EFFECTIVENESS = ['Strong', 'Moderate', 'Weak', 'None'] as const;
export const MITIGATION_STATUSES = ['Planned', 'In Progress', 'Completed', 'Overdue', 'Cancelled'] as const;
export const MITIGATION_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const RISK_SOURCES = ['Previous Audit', 'Self-Assessment', 'External Review', 'Regulatory', 'Risk Workshop', 'Management Referral', 'Other'] as const;

export function calculateRiskLevel(score: number): string {
  if (score >= 16) return 'Critical';
  if (score >= 11) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

export function getRiskLevelVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'Critical': return 'destructive';
    case 'High': return 'destructive';
    case 'Medium': return 'secondary';
    default: return 'outline';
  }
}

// ============= RISK REGISTER =============
export function useRiskRegister(filters?: { audit_universe_id?: string; status?: string; category?: string }) {
  return useQuery({
    queryKey: ['ia_risk_register', filters],
    queryFn: async () => {
      let query = supabase
        .from('ia_risk_register' as any)
        .select('*, ia_audit_universe!left(entity_name, entity_type, entity_code)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters?.audit_universe_id) query = query.eq('audit_universe_id', filters.audit_universe_id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.category) query = query.eq('risk_category', filters.category);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useRiskRegisterMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const create = useMutation({
    mutationFn: async (risk: any) => {
      const inherentScore = (risk.inherent_likelihood || 0) * (risk.inherent_impact || 0);
      const residualScore = (risk.residual_likelihood || 0) * (risk.residual_impact || 0);
      const { data, error } = await supabase
        .from('ia_risk_register' as any)
        .insert({
          ...risk,
          inherent_risk_level: calculateRiskLevel(inherentScore),
          residual_risk_level: calculateRiskLevel(residualScore),
          ...getCreateFields(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_register'] });
      toast({ title: 'Risk Created', description: 'Risk register entry added.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const inherentScore = (updates.inherent_likelihood || 0) * (updates.inherent_impact || 0);
      const residualScore = (updates.residual_likelihood || 0) * (updates.residual_impact || 0);
      const { data, error } = await supabase
        .from('ia_risk_register' as any)
        .update({
          ...updates,
          inherent_risk_level: calculateRiskLevel(inherentScore),
          residual_risk_level: calculateRiskLevel(residualScore),
          ...getUpdateFields(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_register'] });
      toast({ title: 'Risk Updated', description: 'Risk register entry updated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ia_risk_register' as any)
        .update({ is_active: false, ...getUpdateFields() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_register'] });
      toast({ title: 'Risk Removed', description: 'Risk has been deactivated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return { create, update, remove };
}

// ============= MITIGATION ACTIONS =============
export function useRiskMitigationActions(riskId?: string) {
  return useQuery({
    queryKey: ['ia_risk_mitigation_actions', riskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_risk_mitigation_actions' as any)
        .select('*')
        .eq('risk_id', riskId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!riskId,
  });
}

export function useRiskMitigationMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const create = useMutation({
    mutationFn: async (action: any) => {
      const { data, error } = await supabase
        .from('ia_risk_mitigation_actions' as any)
        .insert({ ...action, ...getCreateFields() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_mitigation_actions'] });
      toast({ title: 'Action Created', description: 'Mitigation action added.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('ia_risk_mitigation_actions' as any)
        .update({ ...updates, ...getUpdateFields() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_mitigation_actions'] });
      toast({ title: 'Action Updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return { create, update };
}

// ============= RISK REVIEWS =============
export function useRiskReviews(riskId?: string) {
  return useQuery({
    queryKey: ['ia_risk_reviews', riskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_risk_reviews' as any)
        .select('*')
        .eq('risk_id', riskId!)
        .order('review_date', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!riskId,
  });
}

export function useRiskReviewMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields } = useAuditFields();

  const create = useMutation({
    mutationFn: async (review: any) => {
      const { data, error } = await supabase
        .from('ia_risk_reviews' as any)
        .insert({ ...review, ...getCreateFields() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_reviews'] });
      toast({ title: 'Review Recorded', description: 'Risk review added to timeline.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return { create };
}

// ============= DUPLICATE CHECK =============
export function useDuplicateRiskCheck(auditUniverseId?: string, riskTitle?: string, riskCategory?: string) {
  return useQuery({
    queryKey: ['ia_risk_register_dupes', auditUniverseId, riskTitle, riskCategory],
    queryFn: async () => {
      if (!auditUniverseId || !riskTitle || riskTitle.length < 3) return [];
      const { data, error } = await supabase
        .from('ia_risk_register' as any)
        .select('id, risk_title, risk_category, status, inherent_risk_score')
        .eq('audit_universe_id', auditUniverseId)
        .eq('is_active', true)
        .ilike('risk_title', `%${riskTitle}%`);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!auditUniverseId && !!riskTitle && riskTitle.length >= 3,
  });
}

// ============= MITIGATION TEMPLATES =============
export function useMitigationTemplates(category?: string) {
  return useQuery({
    queryKey: ['ia_mitigation_templates', category],
    queryFn: async () => {
      let query = supabase
        .from('ia_mitigation_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('template_name');
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useMitigationTemplateMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const create = useMutation({
    mutationFn: async (tpl: any) => {
      const { data, error } = await supabase
        .from('ia_mitigation_templates' as any)
        .insert({ ...tpl, ...getCreateFields() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_mitigation_templates'] });
      toast({ title: 'Template Created' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return { create };
}
