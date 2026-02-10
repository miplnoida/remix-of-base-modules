import { format, parseISO, isValid } from 'date-fns';
import { getSystemSettingFromCache } from '@/hooks/useSystemSettings';

// Default date format if no system setting is available
const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';

// Map of format tokens from our system to date-fns format tokens
const formatTokenMap: Record<string, string> = {
  'dd/MM/yyyy': 'dd/MM/yyyy',
  'dd-MM-yyyy': 'dd-MM-yyyy',
  'MM/dd/yyyy': 'MM/dd/yyyy',
  'MM-dd-yyyy': 'MM-dd-yyyy',
  'yyyy-MM-dd': 'yyyy-MM-dd',
  'yyyy/MM/dd': 'yyyy/MM/dd',
  'dd MMM yyyy': 'dd MMM yyyy',
  'MMM dd, yyyy': 'MMM dd, yyyy',
};

/**
 * Safely parse a date string, treating date-only strings (yyyy-MM-dd) as LOCAL dates
 * to prevent timezone offset issues (e.g., Jan 1 becoming Dec 31).
 * 
 * IMPORTANT: parseISO("2026-01-01") creates a UTC midnight Date, which in negative-offset
 * timezones shifts to the previous day in local time. This function detects date-only
 * strings and constructs a local Date instead.
 */
export const parseDateSafe = (dateStr: string): Date => {
  // Match date-only formats: yyyy-MM-dd, yyyy/MM/dd
  const dateOnlyMatch = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    // Create as local date (noon to avoid any DST edge cases)
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0, 0);
  }
  // For full ISO strings with time/timezone, use parseISO
  const parsed = parseISO(dateStr);
  if (isValid(parsed)) return parsed;
  // Fallback
  return new Date(dateStr);
};

/**
 * Internal helper: convert any date input to a valid Date object using timezone-safe parsing
 */
const toDateObj = (date: Date | string | number): Date | null => {
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = parseDateSafe(date);
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  return isValid(dateObj) ? dateObj : null;
};

/**
 * Get the current display date format from system settings
 */
export const getDisplayDateFormat = (): string => {
  return getSystemSettingFromCache('display_date_format', DEFAULT_DATE_FORMAT);
};

/**
 * Format a date using the global display_date_format system setting
 * @param date - Date object, ISO string, or any parseable date value
 * @param customFormat - Optional custom format to override system setting
 * @returns Formatted date string or empty string if invalid
 */
export const formatDisplayDate = (
  date: Date | string | number | null | undefined,
  customFormat?: string
): string => {
  if (!date) return '';
  
  try {
    const dateObj = toDateObj(date);
    if (!dateObj) {
      console.warn('Invalid date provided to formatDisplayDate:', date);
      return '';
    }
    
    const formatString = customFormat || getDisplayDateFormat();
    const dateFnsFormat = formatTokenMap[formatString] || formatString;
    
    return format(dateObj, dateFnsFormat);
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '';
  }
};

/**
 * Format a date with time using the global display_date_format system setting
 */
export const formatDisplayDateTime = (
  date: Date | string | number | null | undefined,
  includeSeconds: boolean = false
): string => {
  if (!date) return '';
  
  try {
    const dateObj = toDateObj(date);
    if (!dateObj) {
      console.warn('Invalid date provided to formatDisplayDateTime:', date);
      return '';
    }
    
    const dateFormatString = getDisplayDateFormat();
    const dateFnsFormat = formatTokenMap[dateFormatString] || dateFormatString;
    const timeFormat = includeSeconds ? 'HH:mm:ss' : 'HH:mm';
    
    return format(dateObj, `${dateFnsFormat} ${timeFormat}`);
  } catch (error) {
    console.error('Error formatting datetime:', error, date);
    return '';
  }
};

/**
 * Get the placeholder text for date inputs based on current format
 */
export const getDatePlaceholder = (): string => {
  const formatString = getDisplayDateFormat();
  return formatString
    .replace(/dd/g, 'DD')
    .replace(/MM/g, 'MM')
    .replace(/MMM/g, 'MMM')
    .replace(/yyyy/g, 'YYYY');
};

/**
 * Format a date for storage (always uses yyyy-MM-dd format, timezone-safe)
 * @param date - Date object or string
 * @returns Date string in yyyy-MM-dd format
 */
export const formatDateForStorage = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = toDateObj(date);
    if (!dateObj) return '';
    
    // Use manual extraction to guarantee no timezone shift
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (error) {
    console.error('Error formatting date for storage:', error, date);
    return '';
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "yesterday")
 * Falls back to formatted date for older dates
 */
export const formatRelativeDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = toDateObj(date);
    if (!dateObj) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return formatDisplayDate(dateObj);
  } catch (error) {
    console.error('Error formatting relative date:', error, date);
    return '';
  }
};
