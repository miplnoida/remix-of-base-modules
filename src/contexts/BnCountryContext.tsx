import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useBnCountryPack } from '@/hooks/bn/useBnCountryPack';
import { useBnCountries } from '@/hooks/bn/useBnConfig';
import { validateIdByCountry } from '@/services/bn/countryPackService';
import type { BnCountryPack, BnCountryIdRule, BnCountryAddressField, BnCountryParticipantType, BnCountryPaymentConfig } from '@/types/bn';

interface BnCountryContextValue {
  activeCountryCode: string;
  setActiveCountryCode: (code: string) => void;
  countryPack: BnCountryPack | null;
  isLoading: boolean;
  primaryIdRule: BnCountryIdRule | null;
  currency: { code: string; symbol: string };
  addressFields: BnCountryAddressField[];
  participantTypes: BnCountryParticipantType[];
  paymentMethods: BnCountryPaymentConfig[];
  validateId: (value: string) => { valid: boolean; message: string };
}

const BnCountryContext = createContext<BnCountryContextValue | undefined>(undefined);

const STORAGE_KEY = 'bn.activeCountryCode';

export const BnCountryProvider: React.FC<{ defaultCountry?: string; children: React.ReactNode }> = ({ defaultCountry, children }) => {
  // 1) user's last choice  2) prop hint  3) (resolved later from DB)  4) 'KN' final fallback
  const initial = (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)) || defaultCountry || '';
  const [activeCountryCode, setActiveCountryCodeState] = useState(initial);
  const { data: allCountries = [] } = useBnCountries();

  // Resolve from DB when not yet chosen: first active country, else first country, else 'KN'.
  useEffect(() => {
    if (activeCountryCode) return;
    if (!allCountries.length) return;
    const firstActive = (allCountries as any[]).find(c => c.is_active) ?? (allCountries as any[])[0];
    if (firstActive?.country_code) setActiveCountryCodeState(firstActive.country_code);
  }, [activeCountryCode, allCountries]);

  const setActiveCountryCode = useCallback((code: string) => {
    setActiveCountryCodeState(code);
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  // Effective code passed to the pack loader — fall back to 'KN' only as a last resort
  // (DB resolution above will replace it as soon as countries load).
  const effectiveCode = activeCountryCode || 'KN';
  const { data: countryPack, isLoading } = useBnCountryPack(effectiveCode);

  const primaryIdRule = useMemo(() =>
    countryPack?.idRules?.find(r => r.is_primary && r.is_active) ?? null,
    [countryPack?.idRules]
  );

  const currency = useMemo(() => ({
    code: countryPack?.country?.currency_code ?? 'XCD',
    symbol: countryPack?.country?.currency_symbol ?? '$',
  }), [countryPack?.country]);

  const addressFields = useMemo(() => countryPack?.addressModel ?? [], [countryPack?.addressModel]);
  const participantTypes = useMemo(() => countryPack?.participantTypes ?? [], [countryPack?.participantTypes]);
  const paymentMethods = useMemo(() => countryPack?.paymentConfig ?? [], [countryPack?.paymentConfig]);

  const validateId = useCallback((value: string) =>
    validateIdByCountry(countryPack?.idRules ?? [], value),
    [countryPack?.idRules]
  );

  const value = useMemo<BnCountryContextValue>(() => ({
    activeCountryCode,
    setActiveCountryCode,
    countryPack: countryPack ?? null,
    isLoading,
    primaryIdRule,
    currency,
    addressFields,
    participantTypes,
    paymentMethods,
    validateId,
  }), [activeCountryCode, countryPack, isLoading, primaryIdRule, currency, addressFields, participantTypes, paymentMethods, validateId]);

  return <BnCountryContext.Provider value={value}>{children}</BnCountryContext.Provider>;
};

export const useBnCountry = (): BnCountryContextValue => {
  const ctx = useContext(BnCountryContext);
  if (!ctx) throw new Error('useBnCountry must be used within <BnCountryProvider>');
  return ctx;
};
