import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatRelativeDate,
  getDatePlaceholder,
  formatDateForStorage,
  formatAuditDate,
  formatAuditDateTime,
} from '@/lib/dateFormat';

/**
 * Hook to access date formatting utilities with real-time system settings.
 *
 * Business dates (DOB, period, expiry…) → formatDate / formatDateTime
 *   No timezone conversion – displayed exactly as stored.
 *
 * Audit timestamps (created_at, updated_at…) → formatAudit / formatAuditDT
 *   Stored in UTC, converted to the user's local timezone on display.
 */
export const useDateFormat = () => {
  const { getSetting } = useSystemSettingsContext();
  // Touch the setting so the component re-renders when it changes
  getSetting('display_date_format', 'dd/MM/yyyy');

  return {
    /** Format a business date (no TZ conversion) */
    formatDate: formatDisplayDate,
    /** Format a business date + time (no TZ conversion) */
    formatDateTime: formatDisplayDateTime,
    /** Relative time string ("2 hours ago") */
    formatRelative: formatRelativeDate,
    /** Placeholder for date inputs (e.g. "DD/MM/YYYY") */
    getPlaceholder: getDatePlaceholder,
    /** Format for storage (always yyyy-MM-dd, TZ-safe) */
    formatForStorage: formatDateForStorage,
    /** Format an audit timestamp (UTC → local TZ, date only) */
    formatAudit: (d: Date | string | number | null | undefined) => formatAuditDate(d, false),
    /** Format an audit timestamp (UTC → local TZ, date + time) */
    formatAuditDT: formatAuditDateTime,
  };
};
