/**
 * BN Person 360 Hooks
 * 
 * React Query hooks for Person 360 screen data loading.
 * All reads are read-only — no mutations from 360 view.
 */
import { useQuery } from '@tanstack/react-query';
import {
  getPersonProfile,
  getPersonDependants,
  getPersonClaims,
  getPersonEntitlements,
  getPersonDisbursements,
  getPersonPayables,
  getPersonEmployers,
  getPersonDocuments,
  getPersonTimeline,
  getPersonSummary,
} from '@/services/bn/person360Service';

const STALE_TIME = 30_000; // 30s

export function usePerson360Profile(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'profile', ssn],
    queryFn: () => getPersonProfile(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Dependants(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'dependants', ssn],
    queryFn: () => getPersonDependants(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Claims(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'claims', ssn],
    queryFn: () => getPersonClaims(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Entitlements(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'entitlements', ssn],
    queryFn: () => getPersonEntitlements(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Disbursements(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'disbursements', ssn],
    queryFn: () => getPersonDisbursements(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Payables(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'payables', ssn],
    queryFn: () => getPersonPayables(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Employers(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'employers', ssn],
    queryFn: () => getPersonEmployers(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Documents(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'documents', ssn],
    queryFn: () => getPersonDocuments(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Timeline(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'timeline', ssn],
    queryFn: () => getPersonTimeline(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}

export function usePerson360Summary(ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'person360', 'summary', ssn],
    queryFn: () => getPersonSummary(ssn!),
    enabled: !!ssn,
    staleTime: STALE_TIME,
  });
}
