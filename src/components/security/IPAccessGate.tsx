/**
 * IPAccessGate
 * Wraps the app and checks if the user's IP is whitelisted before rendering children.
 * Shows a blocked page if the IP is not allowed.
 * Falls open on errors to prevent lockout.
 */

import React from 'react';
import { useIPAccessCheck } from '@/hooks/useIPAccessCheck';
import IPBlocked from '@/pages/IPBlocked';
import { Loader2 } from 'lucide-react';

export const IPAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isChecking, isAllowed } = useIPAccessCheck();

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAllowed === false) {
    return <IPBlocked ipAddress={clientIP} />;
  }

  return <>{children}</>;
};
