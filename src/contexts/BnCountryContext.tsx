import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useBnCountryPack } from '@/hooks/bn/useBnCountryPack';
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

export const BnCountryProvider: React.FC<{ defaultCountry?: string; children: React.ReactNode }> = ({ defaultCountry = 'SKN', children }) => {
  const [activeCountryCode, setActiveCountryCode] = useState(defaultCountry);
  const { data: countryPack, isLoading } = useBnCountryPack(activeCountryCode);

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
