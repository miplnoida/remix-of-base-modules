import { useState, useRef, useCallback } from 'react';

export interface PendingChange {
  field: 'ssn' | 'period';
  newValue: any;
}

/**
 * Hook to manage confirmation dialogs when SSN or Period changes on C3 forms.
 * Tracks whether the form has meaningful committed data that would be lost.
 */
export function useC3FieldChangeConfirmation() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const hasCommittedData = useRef(false);
  const committedSSN = useRef<string>('');
  const committedPeriod = useRef<{ year: number; month: number } | null>(null);

  /** Mark the form as having committed/loaded data for the current SSN/Period */
  const markDataCommitted = useCallback((ssn: string, period: { year: number; month: number } | null | undefined) => {
    hasCommittedData.current = true;
    committedSSN.current = ssn;
    committedPeriod.current = period || null;
  }, []);

  /**
   * Request a change to SSN or Period.
   * Returns true if the change can proceed immediately (no data to lose).
   * Returns false if a confirmation dialog was shown (change is pending).
   */
  const requestChange = useCallback((field: 'ssn' | 'period', newValue: any): boolean => {
    if (!hasCommittedData.current) return true;

    // Check if the value actually changed
    if (field === 'ssn') {
      if (newValue === committedSSN.current) return true;
    } else if (field === 'period') {
      const committed = committedPeriod.current;
      if (committed && newValue?.year === committed.year && newValue?.month === committed.month) return true;
    }

    setPendingChange({ field, newValue });
    setShowConfirm(true);
    return false;
  }, []);

  /** Confirm the pending change. Returns the pending change details for the caller to apply. */
  const confirmChange = useCallback((): PendingChange | null => {
    setShowConfirm(false);
    const change = pendingChange;
    setPendingChange(null);
    hasCommittedData.current = false;
    committedSSN.current = '';
    committedPeriod.current = null;
    return change;
  }, [pendingChange]);

  /** Cancel the pending change. The caller should revert the field to its previous value. */
  const cancelChange = useCallback(() => {
    setShowConfirm(false);
    setPendingChange(null);
  }, []);

  /** Reset committed tracking (e.g., after form reset from parent) */
  const resetCommitted = useCallback(() => {
    hasCommittedData.current = false;
    committedSSN.current = '';
    committedPeriod.current = null;
  }, []);

  return {
    showConfirm,
    pendingChange,
    requestChange,
    confirmChange,
    cancelChange,
    markDataCommitted,
    resetCommitted,
    setShowConfirm,
  };
}
