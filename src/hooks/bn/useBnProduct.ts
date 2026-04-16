import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as productService from '@/services/bn/productService';
import type { BnProduct, BnProductVersion, BnEligibilityRule, BnCalculationRule, BnTimelineRule } from '@/types/bn';

export function useBnProducts() {
  return useQuery({ queryKey: ['bn', 'products'], queryFn: productService.fetchProducts });
}

export function useBnProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'product', id],
    queryFn: () => productService.fetchProductById(id!),
    enabled: !!id && id !== 'new',
  });
}

export function useBnProductVersions(productId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'product-versions', productId],
    queryFn: () => productService.fetchVersionsByProduct(productId!),
    enabled: !!productId && productId !== 'new',
  });
}

export function useBnProductVersion(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'product-version', id],
    queryFn: () => productService.fetchVersionById(id!),
    enabled: !!id,
  });
}

export function useCreateBnProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (product: Partial<BnProduct>) => productService.createProduct(product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'products'] }),
  });
}

export function useUpdateBnProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BnProduct> }) => productService.updateProduct(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn'] }),
  });
}

export function useCreateBnProductVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: Partial<BnProductVersion>) => productService.createProductVersion(version),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'product-versions'] }),
  });
}

export function useCopyBnVersionRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceVersionId, targetVersionId }: { sourceVersionId: string; targetVersionId: string }) =>
      productService.copyVersionRules(sourceVersionId, targetVersionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn'] }),
  });
}

export function useUpdateBnProductVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BnProductVersion> }) => productService.updateProductVersion(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn'] }),
  });
}

// Eligibility Rules
export function useBnEligibilityRules(versionId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'eligibility-rules', versionId],
    queryFn: () => productService.fetchEligibilityRules(versionId!),
    enabled: !!versionId,
  });
}

export function useUpsertBnEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Partial<BnEligibilityRule>) => productService.upsertEligibilityRule(rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'eligibility-rules'] }),
  });
}

export function useDeleteBnEligibilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.deleteEligibilityRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'eligibility-rules'] }),
  });
}

// Calculation Rules
export function useBnCalculationRules(versionId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'calculation-rules', versionId],
    queryFn: () => productService.fetchCalculationRules(versionId!),
    enabled: !!versionId,
  });
}

export function useUpsertBnCalculationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Partial<BnCalculationRule>) => productService.upsertCalculationRule(rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'calculation-rules'] }),
  });
}

export function useDeleteBnCalculationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.deleteCalculationRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'calculation-rules'] }),
  });
}

// Timeline Rules
export function useBnTimelineRules(versionId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'timeline-rules', versionId],
    queryFn: () => productService.fetchTimelineRules(versionId!),
    enabled: !!versionId,
  });
}

export function useUpsertBnTimelineRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Partial<BnTimelineRule>) => productService.upsertTimelineRule(rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'timeline-rules'] }),
  });
}
