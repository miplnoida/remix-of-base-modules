/**
 * Culture / Locale Central Wrapper
 * ---------------------------------
 * SINGLE source of truth for all display formatting (dates, datetime, time,
 * currency, numbers). DO NOT add new culture settings here — this module ONLY
 * consumes the existing Global Settings → General → Date Display Settings
 * (`display_date_format`) via `src/lib/dateFormat.ts`.
 *
 * Storage rules (immutable, never driven by culture settings):
 *   - dates     → YYYY-MM-DD
 *   - datetimes → ISO 8601 (UTC)
 *   - money     → numeric
 *   - numbers   → numeric
 */

import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatAuditDateTime,
  parseDateSafe,
  formatDateForStorage,
  getDisplayDateFormat,
} from '@/lib/dateFormat';
import { format, isValid } from 'date-fns';
import {
  formatCurrency as _formatCurrency,
  formatCurrencyAmount,
} from '@/utils/formatCurrency';

type DateLike = Date | string | number | null | undefined;

/* ---------------- Dates ---------------- */

export const getDateDisplayFormat = (): string => getDisplayDateFormat();

export const formatDate = (value: DateLike): string => formatDisplayDate(value);

export const formatDateTime = (value: DateLike, includeSeconds = false): string =>
  formatDisplayDateTime(value, includeSeconds);

/** Audit / UTC timestamp → local timezone */
export const formatAuditTimestamp = (value: DateLike, includeSeconds = false): string =>
  formatAuditDateTime(value, includeSeconds);

export const formatTime = (value: DateLike, includeSeconds = false): string => {
  if (!value) return '';
  try {
    const d = typeof value === 'string' ? parseDateSafe(value) : new Date(value as any);
    if (!isValid(d)) return '';
    return format(d, includeSeconds ? 'HH:mm:ss' : 'HH:mm');
  } catch {
    return '';
  }
};

/** Parse user-typed date string (yyyy-MM-dd or display format) → Date */
export const parseDateInput = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = parseDateSafe(value);
  return isValid(d) ? d : null;
};

/** Always YYYY-MM-DD for storage */
export const toStorageDate = (value: Date | string | null | undefined): string =>
  formatDateForStorage(value as any);

/** Always ISO-8601 (UTC) for storage */
export const toStorageDateTime = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? d.toISOString() : '';
};

/* ---------------- Money / Numbers ---------------- */

export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || isNaN(Number(value))) return '';
  return _formatCurrency(Number(value));
};

export const formatNumber = (
  value: number | null | undefined,
  fractionDigits = 2,
): string => {
  if (value == null || isNaN(Number(value))) return '';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

export const formatPercent = (
  value: number | null | undefined,
  fractionDigits = 2,
): string => {
  if (value == null || isNaN(Number(value))) return '';
  return `${formatNumber(Number(value), fractionDigits)}%`;
};

/* ---------------- Age ---------------- */

export const calculateAge = (
  dateOfBirth: DateLike,
  asOfDate: DateLike = new Date(),
): number | null => {
  if (!dateOfBirth) return null;
  const dob =
    typeof dateOfBirth === 'string' ? parseDateSafe(dateOfBirth) : new Date(dateOfBirth as any);
  const asOf =
    typeof asOfDate === 'string' ? parseDateSafe(asOfDate) : new Date(asOfDate as any);
  if (!isValid(dob) || !isValid(asOf)) return null;
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
  return age;
};

/* ---------------- Re-exports for convenience ---------------- */
export { formatCurrencyAmount };
