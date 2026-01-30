// Utility functions for calculating Mondays in a month for C3 Management

/**
 * Get all Mondays in a given month and year
 */
export function getMondaysInMonth(year: number, month: number): Date[] {
  const mondays: Date[] = [];
  const date = new Date(year, month, 1);
  
  // Find the first Monday
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  
  // Collect all Mondays in the month
  while (date.getMonth() === month) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  
  return mondays;
}

/**
 * Get the count of Mondays in a month (4 or 5)
 */
export function getMondayCount(year: number, month: number): number {
  return getMondaysInMonth(year, month).length;
}

/**
 * Determine which week checkboxes should be enabled based on the selected period
 * Returns an array of 5 booleans (one for each week checkbox)
 */
export function getEnabledWeekCheckboxes(year: number, month: number): boolean[] {
  const mondayCount = getMondayCount(year, month);
  return [
    true,  // Week 1
    true,  // Week 2
    true,  // Week 3
    true,  // Week 4
    mondayCount >= 5  // Week 5 - only enabled if month has 5 Mondays
  ];
}

/**
 * Get enabled week textboxes based on pay period
 * @param payPeriod - 'Weekly' | 'Bi-Weekly' | 'Monthly' | '2 Monthly'
 * @param year - Year of the period
 * @param month - Month of the period (0-indexed)
 * @param termStartDate - Employee's term start date for bi-weekly calculation
 */
export function getEnabledWeekTextboxes(
  payPeriod: string,
  year: number,
  month: number,
  termStartDate?: string
): boolean[] {
  const mondayCount = getMondayCount(year, month);
  const mondays = getMondaysInMonth(year, month);
  
  switch (payPeriod) {
    case 'Monthly': {
      // Only enable the last Monday textbox
      const enabled = [false, false, false, false, false];
      const lastMondayIndex = mondayCount - 1;
      if (lastMondayIndex >= 0 && lastMondayIndex < 5) {
        enabled[lastMondayIndex] = true;
      }
      return enabled;
    }
    
    case 'Weekly': {
      // Enable textboxes equal to number of Mondays
      return [
        true,
        true,
        true,
        true,
        mondayCount >= 5
      ];
    }
    
    case 'Bi-Weekly': {
      // Use term start date to determine which Mondays are even-numbered
      const enabled = [false, false, false, false, false];
      
      if (!termStartDate) {
        // If no term start date, enable even weeks (2nd, 4th)
        enabled[1] = true;
        enabled[3] = true;
        return enabled;
      }
      
      const startDate = new Date(termStartDate);
      
      // Calculate which Mondays fall on even pay periods from the start date
      mondays.forEach((monday, index) => {
        // Calculate weeks since term start
        const diffTime = monday.getTime() - startDate.getTime();
        const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
        
        // Enable if it's an even week number from start date
        if (diffWeeks >= 0 && diffWeeks % 2 === 1) {
          enabled[index] = true;
        }
      });
      
      return enabled;
    }
    
    case '2 Monthly': {
      // Enable only 2nd and 4th week textboxes
      return [false, true, false, true, false];
    }
    
    default:
      return [false, false, false, false, false];
  }
}

/**
 * Parse period string (e.g., "2026-01" or "Jan 2026") to year and month
 */
export function parsePeriod(period: string): { year: number; month: number } | null {
  if (!period) return null;
  
  // Try ISO format (YYYY-MM)
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(period)) {
    const parts = period.split('-');
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1]) - 1 // Convert to 0-indexed
    };
  }
  
  // Try "Mon YYYY" format
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const match = period.toLowerCase().match(/^([a-z]+)\s*(\d{4})$/);
  if (match) {
    const monthIndex = monthNames.findIndex(m => match[1].startsWith(m));
    if (monthIndex !== -1) {
      return {
        year: parseInt(match[2]),
        month: monthIndex
      };
    }
  }
  
  return null;
}

/**
 * Format period for display (e.g., "January 2026")
 */
export function formatPeriodDisplay(year: number, month: number): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  return `${monthNames[month]} ${year}`;
}

/**
 * Format period for storage (e.g., "2026-01-01")
 */
export function formatPeriodForStorage(year: number, month: number): string {
  const monthStr = String(month + 1).padStart(2, '0');
  return `${year}-${monthStr}-01`;
}
