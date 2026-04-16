/**
 * Benefits Dashboard Hooks
 */
import { useQuery } from '@tanstack/react-query';
import * as dashboardService from '@/services/bn/dashboardService';

export function useBnDashboardSummary() {
  return useQuery({
    queryKey: ['bn', 'dashboard', 'summary'],
    queryFn: dashboardService.fetchDashboardSummary,
    staleTime: 60_000, // refresh every minute
  });
}

export function useBnClaimsByStatus() {
  return useQuery({
    queryKey: ['bn', 'dashboard', 'claims-by-status'],
    queryFn: dashboardService.fetchClaimsByStatus,
    staleTime: 60_000,
  });
}

export function useBnClaimsByProduct() {
  return useQuery({
    queryKey: ['bn', 'dashboard', 'claims-by-product'],
    queryFn: dashboardService.fetchClaimsByProduct,
    staleTime: 60_000,
  });
}

export function useBnClaimAging() {
  return useQuery({
    queryKey: ['bn', 'dashboard', 'aging'],
    queryFn: dashboardService.fetchClaimAging,
    staleTime: 60_000,
  });
}

export function useBnRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ['bn', 'dashboard', 'recent-activity', limit],
    queryFn: () => dashboardService.fetchRecentActivity(limit),
    staleTime: 30_000,
  });
}

export function useBnMyAssignments(userCode: string) {
  return useQuery({
    queryKey: ['bn', 'dashboard', 'my-assignments', userCode],
    queryFn: () => dashboardService.fetchMyAssignments(userCode),
    enabled: !!userCode,
    staleTime: 30_000,
  });
}
