import { format, parseISO, isValid } from 'date-fns';
import { getSystemSettingFromCache } from '@/hooks/useSystemSettings';

// Default date format if no system setting is available
const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';

// Map of format tokens from our system to date-fns format tokens
// Our formats use the same tokens as date-fns, so no conversion needed
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
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Try to parse ISO string
      dateObj = parseISO(date);
      if (!isValid(dateObj)) {
        // Try direct Date constructor as fallback
        dateObj = new Date(date);
      }
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    if (!isValid(dateObj)) {
      console.warn('Invalid date provided to formatDisplayDate:', date);
      return '';
    }
    
    // Use custom format or get from system settings
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
 * @param date - Date object, ISO string, or any parseable date value
 * @param includeSeconds - Whether to include seconds in time display
 * @returns Formatted date and time string or empty string if invalid
 */
export const formatDisplayDateTime = (
  date: Date | string | number | null | undefined,
  includeSeconds: boolean = false
): string => {
  if (!date) return '';
  
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = parseISO(date);
      if (!isValid(dateObj)) {
        dateObj = new Date(date);
      }
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    if (!isValid(dateObj)) {
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
 * @returns Uppercase format placeholder (e.g., "DD/MM/YYYY")
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
 * Format a date for storage (always uses ISO format)
 * @param date - Date object or string
 * @returns ISO date string (yyyy-MM-dd)
 */
export const formatDateForStorage = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = parseISO(date);
      if (!isValid(dateObj)) {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    if (!isValid(dateObj)) {
      return '';
    }
    
    return format(dateObj, 'yyyy-MM-dd');
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
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = parseISO(date);
      if (!isValid(dateObj)) {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    if (!isValid(dateObj)) {
      return '';
    }
    
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
