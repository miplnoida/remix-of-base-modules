// Social Security Application Theme Colors for Charts
// Primary Green: #009B4C, Dark Green: #00713A, Accent Blue: #2563EB, Soft Teal: #0EA5E9, Gold: #F59E0B

export const CHART_COLORS = {
  primary: '#009B4C',      // Primary Green
  primaryDark: '#00713A',  // Dark Green
  blue: '#2563EB',         // Accent Blue
  teal: '#0EA5E9',         // Soft Teal
  gold: '#F59E0B',         // Gold (warnings/status)
  gray: '#CBD5E1',         // Neutral Gray
  grayDark: '#64748B',     // Darker Gray
  text: '#334155',         // Text labels (NOT black)
  gridline: '#E2E8F0',     // Subtle gridlines
  background: '#F8FAFC',   // Soft neutral background
  success: '#009B4C',      // Same as primary
  warning: '#F59E0B',      // Gold
  error: '#EF4444',        // Red for errors
  info: '#0EA5E9',         // Teal for info
};

// Chart color palettes for different chart types
export const CHART_PALETTES = {
  // For bar/column charts - mix of greens, blues, golds
  bars: [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.gold, CHART_COLORS.primaryDark],
  
  // For line charts - primary green for main line, blue/teal for comparisons
  lines: {
    primary: CHART_COLORS.primary,
    secondary: CHART_COLORS.blue,
    tertiary: CHART_COLORS.teal,
  },
  
  // For pie/donut charts - varied palette
  pie: [CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.gold, CHART_COLORS.primaryDark, CHART_COLORS.grayDark],
  
  // Status-based colors
  status: {
    approved: CHART_COLORS.success,
    pending: CHART_COLORS.gold,
    rejected: CHART_COLORS.error,
    completed: CHART_COLORS.success,
    inProgress: CHART_COLORS.blue,
    notStarted: CHART_COLORS.gray,
  }
};

// Grid and axis styling
export const CHART_STYLES = {
  grid: {
    stroke: CHART_COLORS.gridline,
    strokeDasharray: '3 3',
  },
  axis: {
    stroke: CHART_COLORS.text,
    style: { fontSize: '12px', fill: CHART_COLORS.text },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: `1px solid ${CHART_COLORS.gridline}`,
      borderRadius: '6px',
      padding: '8px',
    },
    labelStyle: {
      color: CHART_COLORS.text,
      fontWeight: '600',
    },
  },
};
