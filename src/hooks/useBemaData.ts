import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bemaService } from "@/services/bemaService";
import { toast } from "sonner";

export function useBemaRegistrations(filters?: any) {
  return useQuery({
    queryKey: ['bema-registrations', filters],
    queryFn: () => bemaService.getRegistrations(filters),
  });
}

export function useCreateBemaRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bemaService.createRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bema-registrations'] });
      toast.success('Registration created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create registration');
    },
  });
}

export function useBemaC3Submissions(filters?: any) {
  return useQuery({
    queryKey: ['bema-c3-submissions', filters],
    queryFn: () => bemaService.getC3Submissions(filters),
  });
}

export function useCreateBemaC3Submission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bemaService.createC3Submission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bema-c3-submissions'] });
      toast.success('C3 submission created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create C3 submission');
    },
  });
}

export function useBemaArrears(filters?: any) {
  return useQuery({
    queryKey: ['bema-arrears', filters],
    queryFn: () => bemaService.getArrears(filters),
  });
}

export function useBemaPaymentPlans(filters?: any) {
  return useQuery({
    queryKey: ['bema-payment-plans', filters],
    queryFn: () => bemaService.getPaymentPlans(filters),
  });
}

export function useCreateBemaPaymentPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bemaService.createPaymentPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bema-payment-plans'] });
      toast.success('Payment plan created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create payment plan');
    },
  });
}

export function useBemaAuditCases(filters?: any) {
  return useQuery({
    queryKey: ['bema-audit-cases', filters],
    queryFn: () => bemaService.getAuditCases(filters),
  });
}

export function useCreateBemaAuditCase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bemaService.createAuditCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bema-audit-cases'] });
      toast.success('Audit case created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create audit case');
    },
  });
}

export function useBemaContributors(filters?: any) {
  return useQuery({
    queryKey: ['bema-contributors', filters],
    queryFn: () => bemaService.getContributors(filters),
  });
}

export function useBemaWaivers(filters?: any) {
  return useQuery({
    queryKey: ['bema-waivers', filters],
    queryFn: () => bemaService.getWaivers(filters),
  });
}

export function useCreateBemaWaiver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bemaService.createWaiver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bema-waivers'] });
      toast.success('Waiver request created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create waiver request');
    },
  });
}

export function useBemaZones() {
  return useQuery({
    queryKey: ['bema-zones'],
    queryFn: bemaService.getZones,
  });
}

export function useBemaDashboardStats() {
  return useQuery({
    queryKey: ['bema-dashboard-stats'],
    queryFn: bemaService.getDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
