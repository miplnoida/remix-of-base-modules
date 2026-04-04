import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as productService from '@/services/bn/productService';
import type { BnProduct } from '@/types/bn';

export function useBnProducts() {
  return useQuery({
    queryKey: ['bn', 'products'],
    queryFn: productService.fetchProducts,
  });
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
    enabled: !!productId,
  });
}

export function useCreateBnProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'product', 'create'],
    mutationFn: (product: Partial<BnProduct>) => productService.createProduct(product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'products'] }),
  });
}

export function useUpdateBnProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'product', 'update'],
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BnProduct> }) =>
      productService.updateProduct(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'products'] }),
  });
}
