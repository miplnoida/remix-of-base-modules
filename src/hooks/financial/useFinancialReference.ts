/**
 * useFinancialReference — canonical hooks for the shared Financial Reference Domain
 * Pack (Epic 2.4). Every module MUST consume via these hooks or financialReferenceService,
 * never via direct table access.
 */
import { useQuery } from '@tanstack/react-query';
import { financialReferenceService } from '@/services/financial/financialReferenceService';

const STALE = 5 * 60 * 1000;

export function useCurrencies() {
  return useQuery({
    queryKey: ['fin', 'currencies'],
    queryFn: () => financialReferenceService.listCurrencies(),
    staleTime: STALE,
  });
}

export function useExchangeRates(from?: string, to?: string) {
  return useQuery({
    queryKey: ['fin', 'fx', from ?? null, to ?? null],
    queryFn: () => financialReferenceService.listExchangeRates(from, to),
    staleTime: STALE,
  });
}

export function useBanks(countryCode?: string | null) {
  return useQuery({
    queryKey: ['fin', 'banks', countryCode ?? null],
    queryFn: () => financialReferenceService.listBanks(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useBankBranches(bankId?: string | null) {
  return useQuery({
    queryKey: ['fin', 'branches', bankId ?? null],
    queryFn: () => financialReferenceService.listBankBranches(bankId ?? null),
    enabled: !!bankId,
    staleTime: STALE,
  });
}

export function usePaymentChannels(countryCode?: string | null) {
  return useQuery({
    queryKey: ['fin', 'channels', countryCode ?? null],
    queryFn: () => financialReferenceService.listPaymentChannels(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useSettlementMethods() {
  return useQuery({
    queryKey: ['fin', 'settlement-methods'],
    queryFn: () => financialReferenceService.listSettlementMethods(),
    staleTime: STALE,
  });
}

export function useAccountTypes() {
  return useQuery({
    queryKey: ['fin', 'account-types'],
    queryFn: () => financialReferenceService.listAccountTypes(),
    staleTime: STALE,
  });
}

export function useTaxReferences(countryCode?: string | null) {
  return useQuery({
    queryKey: ['fin', 'tax-refs', countryCode ?? null],
    queryFn: () => financialReferenceService.listTaxReferences(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useChartOfAccountRefs(countryCode?: string | null) {
  return useQuery({
    queryKey: ['fin', 'coa', countryCode ?? null],
    queryFn: () => financialReferenceService.listChartOfAccountRefs(countryCode ?? null),
    staleTime: STALE,
  });
}

export function useFinancialExternalCodes(entityType?: string) {
  return useQuery({
    queryKey: ['fin', 'ext-codes', entityType ?? null],
    queryFn: () => financialReferenceService.listFinancialExternalCodes(entityType),
    staleTime: STALE,
  });
}

export function useCountryFinancialAvailability(countryCode?: string | null) {
  return useQuery({
    queryKey: ['fin', 'country-availability', countryCode ?? null],
    queryFn: () => financialReferenceService.listCountryAvailability(countryCode ?? null),
    enabled: !!countryCode,
    staleTime: STALE,
  });
}

/** Aggregate hook — mirrors useGeography()/useIdentity aggregate pattern. */
export function useFinancialReference() {
  const currencies = useCurrencies();
  return {
    currencies: currencies.data ?? [],
    isLoading: currencies.isLoading,
    error: currencies.error,
  };
}
