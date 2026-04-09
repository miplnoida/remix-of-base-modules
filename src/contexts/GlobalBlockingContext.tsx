import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface GlobalBlockingContextType {
  isBlocking: boolean;
  blockingLabel: string | undefined;
  startBlocking: (label?: string) => void;
  stopBlocking: () => void;
}

const GlobalBlockingContext = createContext<GlobalBlockingContextType | undefined>(undefined);

const TIMEOUT_MS = 30_000;

export function GlobalBlockingProvider({ children }: { children: React.ReactNode }) {
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockingLabel, setBlockingLabel] = useState<string | undefined>();
  const activeCount = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeout_ = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startBlocking = useCallback((label?: string) => {
    activeCount.current += 1;
    setIsBlocking(true);
    if (label) setBlockingLabel(label);

    // Reset timeout on every new blocking call
    clearTimeout_();
    timeoutRef.current = setTimeout(() => {
      console.warn('[GlobalBlocking] Timeout reached — force-releasing overlay');
      activeCount.current = 0;
      setIsBlocking(false);
      setBlockingLabel(undefined);
      toast.warning('Operation timed out — please check your data');
    }, TIMEOUT_MS);
  }, [clearTimeout_]);

  const stopBlocking = useCallback(() => {
    activeCount.current = Math.max(0, activeCount.current - 1);
    if (activeCount.current === 0) {
      clearTimeout_();
      setIsBlocking(false);
      setBlockingLabel(undefined);
    }
  }, [clearTimeout_]);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout_(), [clearTimeout_]);

  return (
    <GlobalBlockingContext.Provider value={{ isBlocking, blockingLabel, startBlocking, stopBlocking }}>
      {children}
    </GlobalBlockingContext.Provider>
  );
}

export function useGlobalBlocking() {
  const ctx = useContext(GlobalBlockingContext);
  if (!ctx) throw new Error('useGlobalBlocking must be used within GlobalBlockingProvider');
  return ctx;
}
