/**
 * useDefaultCountry — Epic 2.4A bootstrap.
 *
 * Returns the platform's default operational country. Resolution order:
 *  1. Country flagged with notes containing "Default operational country" (bootstrap marker).
 *  2. First active country in `ssp_country_profile`.
 *  3. Hard fallback: 'KN' (Saint Kitts and Nevis).
 *
 * All shared-domain screens should auto-select this country when the operator
 * has not made an explicit choice, so single-country deployments remain usable.
 */
import { useMemo } from 'react';
import { useCountries } from './useGeography';

export const DEFAULT_COUNTRY_CODE = 'KN';

export function useDefaultCountry() {
  const { data: countries = [], isLoading, error } = useCountries();

  const defaultCountry = useMemo(() => {
    if (!countries.length) return null;
    const active = countries.filter((c: any) => c.is_active !== false);
    const pool = active.length ? active : countries;
    const marked = pool.find((c: any) =>
      (c.notes ?? '').toLowerCase().includes('default operational country')
    );
    return marked ?? pool[0] ?? null;
  }, [countries]);

  return {
    country: defaultCountry,
    countryCode: defaultCountry?.country_code ?? DEFAULT_COUNTRY_CODE,
    isLoading,
    error,
    isSingleCountry: countries.filter((c: any) => c.is_active !== false).length === 1,
  };
}

/** Non-hook accessor for services/utilities. */
export function getDefaultCountryCode(countries: Array<{ country_code: string; is_active?: boolean; notes?: string | null }>): string {
  if (!countries?.length) return DEFAULT_COUNTRY_CODE;
  const active = countries.filter((c) => c.is_active !== false);
  const pool = active.length ? active : countries;
  const marked = pool.find((c) => (c.notes ?? '').toLowerCase().includes('default operational country'));
  return (marked ?? pool[0])?.country_code ?? DEFAULT_COUNTRY_CODE;
}
