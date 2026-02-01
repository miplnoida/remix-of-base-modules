import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import { formatDisplayDate, formatDisplayDateTime, formatRelativeDate, getDatePlaceholder, formatDateForStorage } from '@/lib/dateFormat';

/**
 * Hook to access date formatting utilities with real-time system settings
 * 
 * This hook provides access to all date formatting functions that read from
 * the global display_date_format system setting. Use this hook in components
 * where you need to format dates.
 * 
 * The format is cached and automatically updated when the setting changes.
 * 
 * @example
 * ```tsx
 * const { formatDate, formatDateTime } = useDateFormat();
 * 
 * return <span>{formatDate(record.createdAt)}</span>;
 * ```
 */
export const useDateFormat = () => {
  // This triggers a re-render when settings change
  const { getSetting } = useSystemSettingsContext();
  
  // Access the setting to ensure component re-renders on change
  getSetting('display_date_format', 'dd/MM/yyyy');
  
  return {
    /**
     * Format a date using the global display_date_format setting
     * @param date - Date object, ISO string, or timestamp
     * @param customFormat - Optional custom format to override system setting
     */
    formatDate: formatDisplayDate,
    
    /**
     * Format a date with time using the global display_date_format setting
     * @param date - Date object, ISO string, or timestamp
     * @param includeSeconds - Whether to include seconds (default: false)
     */
    formatDateTime: formatDisplayDateTime,
    
    /**
     * Format a date as relative time (e.g., "2 hours ago", "yesterday")
     * Falls back to formatted date for older dates
     */
    formatRelative: formatRelativeDate,
    
    /**
     * Get the placeholder text for date inputs based on current format
     * @returns Uppercase format placeholder (e.g., "DD/MM/YYYY")
     */
    getPlaceholder: getDatePlaceholder,
    
    /**
     * Format a date for storage (always uses ISO format yyyy-MM-dd)
     */
    formatForStorage: formatDateForStorage,
  };
};
