/**
 * IPAccessGate
 * Non-blocking: renders children immediately while IP check runs in background.
 * Only shows the blocked page if the check explicitly returns false.
 * Falls open on errors to prevent lockout.
 */

import React from 'react';
import { useIPAccessCheck } from '@/hooks/useIPAccessCheck';
import IPBlocked from '@/pages/IPBlocked';

export const IPAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAllowed, clientIP } = useIPAccessCheck();

  // Only block if explicitly denied — render children while checking or on errors
  if (isAllowed === false) {
    return <IPBlocked ipAddress={clientIP} />;
  }

  return <>{children}</>;
};
