/**
 * BN-MORT-UI-RECOVERY-2E §2 — Benefits query cache lifecycle.
 *
 * On identity or authGeneration change (including sign-out), cancel and
 * remove all cached entries whose root key is `bn-benefits-query`. Other
 * caches are untouched.
 *
 * Mounted once, under QueryClientProvider + SupabaseAuthProvider.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const BENEFITS_ROOT_KEY = 'bn-benefits-query';

export function BenefitsQueryLifecycle() {
  const qc = useQueryClient();
  const { user, authGeneration } = useSupabaseAuth();
  const initialised = useRef(false);
  const prevUserId = useRef<string | null>(user?.id ?? null);
  const prevGen = useRef<number>(authGeneration);

  useEffect(() => {
    const currentUserId = user?.id ?? null;

    if (!initialised.current) {
      // First run — record baseline, do not evict caches.
      initialised.current = true;
      prevUserId.current = currentUserId;
      prevGen.current = authGeneration;
      return;
    }

    const identityChanged = prevUserId.current !== currentUserId;
    const generationChanged = prevGen.current !== authGeneration;

    if (identityChanged || generationChanged) {
      // Cancel in-flight Benefits queries; then remove their cache entries.
      void qc.cancelQueries({ queryKey: [BENEFITS_ROOT_KEY], exact: false });
      qc.removeQueries({ queryKey: [BENEFITS_ROOT_KEY], exact: false });
    }

    prevUserId.current = currentUserId;
    prevGen.current = authGeneration;
  }, [qc, user?.id, authGeneration]);

  return null;
}
