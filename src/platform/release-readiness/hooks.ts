import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attestCheck,
  checkAdminAccessHealth,
  exportReport,
  getLatestRun,
  listAttestations,
  listRuns,
  overrideCheck,
  revokeAttestation,
  runReadinessChecks,
} from './service';
import type { AttestationInput, ReleaseReadinessRun } from './types';

const K = ['core-release-readiness'];

export const useReadinessRuns = () => useQuery({ queryKey: [...K, 'runs'], queryFn: () => listRuns() });
export const useLatestReadinessRun = (releaseTag?: string) =>
  useQuery({ queryKey: [...K, 'latest', releaseTag ?? '_'], queryFn: () => getLatestRun(releaseTag) });
export const useReadinessAttestations = (releaseTag: string) =>
  useQuery({
    queryKey: [...K, 'attestations', releaseTag],
    queryFn: () => listAttestations(releaseTag),
    enabled: !!releaseTag,
  });
export const useReadinessAdminHealth = () =>
  useQuery({ queryKey: [...K, 'admin-health'], queryFn: checkAdminAccessHealth });

export function useRunReadinessChecks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ releaseTag, notes }: { releaseTag: string; notes?: string }) =>
      runReadinessChecks(releaseTag, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useAttestCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AttestationInput) => attestCheck(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useRevokeAttestation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeAttestation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useOverrideCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ releaseTag, checkCode, reason }: { releaseTag: string; checkCode: string; reason: string }) =>
      overrideCheck(releaseTag, checkCode, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: K }),
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (run: ReleaseReadinessRun) => exportReport(run),
  });
}
