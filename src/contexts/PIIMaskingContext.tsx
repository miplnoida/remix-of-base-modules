/**
 * PII Context
 * Provides PII masking state and unlock functionality across the application.
 * 
 * Usage in components:
 *   const { shouldMask, maskValue, requestUnlock } = usePIIMasking();
 *   const displayValue = shouldMask ? maskValue(ssn, 'ssn') : ssn;
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  maskPIIValue,
  verifyCredentialsForPIIUnlock,
  logPIIUnlock,
  type PIIFieldType,
} from '@/services/piiMaskingService';
import { getSecurityConfig } from '@/services/securityPolicyService';
import { getClientIP } from '@/services/securityPolicyService';
import { logAuditTrail } from '@/services/auditService';

interface PIIUnlockState {
  [profileId: string]: {
    unlocked: boolean;
    expiresAt: number;
  };
}

interface PIIMaskingContextType {
  /** Whether PII should be masked for this user */
  shouldMask: boolean;
  /** Mask a PII value */
  maskValue: (value: string | number | null | undefined, type?: PIIFieldType) => string;
  /** Check if a specific profile's PII is unlocked */
  isProfileUnlocked: (profileId: string) => boolean;
  /** Request PII unlock for a specific profile (requires password) */
  requestUnlock: (profileId: string, profileType?: string) => void;
  /** The profile ID currently being unlocked (shows dialog) */
  unlockingProfileId: string | null;
  unlockingProfileType: string;
  /** Handle the unlock dialog result */
  handleUnlockSubmit: (password: string) => Promise<boolean>;
  /** Cancel unlock dialog */
  cancelUnlock: () => void;
  /** Whether PII masking feature is enabled globally */
  piiMaskEnabled: boolean;
}

const PIIMaskingContext = createContext<PIIMaskingContextType>({
  shouldMask: false,
  maskValue: (v) => String(v ?? ''),
  isProfileUnlocked: () => false,
  requestUnlock: () => {},
  unlockingProfileId: null,
  unlockingProfileType: 'insured_person',
  handleUnlockSubmit: async () => false,
  cancelUnlock: () => {},
  piiMaskEnabled: true,
});

export const usePIIMasking = () => useContext(PIIMaskingContext);

export const PIIMaskingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, profile } = useSupabaseAuth();
  const [unlockStates, setUnlockStates] = useState<PIIUnlockState>({});
  const [unlockingProfileId, setUnlockingProfileId] = useState<string | null>(null);
  const [unlockingProfileType, setUnlockingProfileType] = useState('insured_person');

  // Get PII masking config
  const { data: config } = useQuery({
    queryKey: ['security-config-pii'],
    queryFn: getSecurityConfig,
    staleTime: 60_000,
  });

  const piiMaskEnabled = config?.pii_mask_enabled ?? true;

  // Admin users never see masked data
  const shouldMask = piiMaskEnabled && !isAdmin;

  // Clean up expired unlocks
  useEffect(() => {
    const interval = setInterval(() => {
      setUnlockStates(prev => {
        const now = Date.now();
        const updated = { ...prev };
        let changed = false;
        for (const key in updated) {
          if (updated[key].expiresAt < now) {
            delete updated[key];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const maskValue = useCallback(
    (value: string | number | null | undefined, type: PIIFieldType = 'generic') => {
      if (!shouldMask) return String(value ?? '');
      return maskPIIValue(value, type);
    },
    [shouldMask]
  );

  const isProfileUnlocked = useCallback(
    (profileId: string) => {
      if (!shouldMask) return true;
      const state = unlockStates[profileId];
      return state?.unlocked && state.expiresAt > Date.now();
    },
    [shouldMask, unlockStates]
  );

  const requestUnlock = useCallback((profileId: string, profileType = 'insured_person') => {
    setUnlockingProfileId(profileId);
    setUnlockingProfileType(profileType);
  }, []);

  const cancelUnlock = useCallback(() => {
    setUnlockingProfileId(null);
  }, []);

  const handleUnlockSubmit = useCallback(async (password: string): Promise<boolean> => {
    if (!user?.email || !unlockingProfileId) return false;

    const ip = await getClientIP();
    const success = await verifyCredentialsForPIIUnlock(user.email, password);
    const durationMinutes = config?.pii_unlock_duration_minutes ?? 15;

    // Log the attempt
    await logPIIUnlock({
      userId: user.id,
      userCode: profile?.user_code || undefined,
      profileId: unlockingProfileId,
      profileType: unlockingProfileType,
      success,
      failureReason: success ? undefined : 'Invalid credentials',
      ipAddress: ip,
    });

    // Audit trail
    await logAuditTrail({
      action: success ? 'pii_unlock_success' : 'pii_unlock_failed',
      entityType: unlockingProfileType,
      entityId: unlockingProfileId,
      module: 'Security',
      userCode: profile?.user_code || undefined,
      userId: user.id,
      metadata: {
        ip_address: ip,
        profile_type: unlockingProfileType,
        success,
      },
    });

    if (success) {
      setUnlockStates(prev => ({
        ...prev,
        [unlockingProfileId]: {
          unlocked: true,
          expiresAt: Date.now() + durationMinutes * 60_000,
        },
      }));
      setUnlockingProfileId(null);
    }

    return success;
  }, [user, profile, unlockingProfileId, unlockingProfileType, config]);

  return (
    <PIIMaskingContext.Provider
      value={{
        shouldMask,
        maskValue,
        isProfileUnlocked,
        requestUnlock,
        unlockingProfileId,
        unlockingProfileType,
        handleUnlockSubmit,
        cancelUnlock,
        piiMaskEnabled,
      }}
    >
      {children}
    </PIIMaskingContext.Provider>
  );
};
