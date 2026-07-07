import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './auditService';
import type {
  AuditEventTypeFormValues,
  AuditLogFilters,
  AuditPolicyFormValues,
} from './auditTypes';

const KEYS = {
  logs: (f: AuditLogFilters) => ['core-audit-log', f] as const,
  log: (id: string) => ['core-audit-log', id] as const,
  summary: (f: AuditLogFilters) => ['core-audit-summary', f] as const,
  events: (f: unknown) => ['core-audit-event-types', f] as const,
  policies: (f: unknown) => ['core-audit-policies', f] as const,
};

export const useAuditLogs = (filters: AuditLogFilters = {}) =>
  useQuery({ queryKey: KEYS.logs(filters), queryFn: () => svc.getAuditLogs(filters) });

export const useAuditLog = (id: string | null | undefined) =>
  useQuery({
    queryKey: KEYS.log(id ?? ''),
    queryFn: () => svc.getAuditLogById(id as string),
    enabled: !!id,
  });

export const useAuditSummary = (filters: AuditLogFilters = {}) =>
  useQuery({ queryKey: KEYS.summary(filters), queryFn: () => svc.getAuditSummary(filters) });

export const useAuditEventTypes = (filters: { search?: string; is_active?: boolean } = {}) =>
  useQuery({ queryKey: KEYS.events(filters), queryFn: () => svc.getAuditEventTypes(filters) });

export const useCreateAuditEventType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AuditEventTypeFormValues) => svc.createAuditEventType(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-event-types'] }),
  });
};
export const useUpdateAuditEventType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AuditEventTypeFormValues> }) =>
      svc.updateAuditEventType(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-event-types'] }),
  });
};
export const useDeactivateAuditEventType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateAuditEventType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-event-types'] }),
  });
};
export const useReactivateAuditEventType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.reactivateAuditEventType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-event-types'] }),
  });
};

export const useAuditPolicies = (filters: { search?: string; is_active?: boolean } = {}) =>
  useQuery({ queryKey: KEYS.policies(filters), queryFn: () => svc.getAuditPolicies(filters) });

export const useCreateAuditPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AuditPolicyFormValues) => svc.createAuditPolicy(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-policies'] }),
  });
};
export const useUpdateAuditPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AuditPolicyFormValues> }) =>
      svc.updateAuditPolicy(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-policies'] }),
  });
};
export const useDeactivateAuditPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateAuditPolicy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-policies'] }),
  });
};
export const useReactivateAuditPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.reactivateAuditPolicy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['core-audit-policies'] }),
  });
};
