// Executive Slate Theme Colors for Charts
// Primary Green: #1E8E3E, Accent Yellow: #F4C430, Alert Red: #D62828, Secondary Slate: #1F2A37

export const CHART_COLORS = {
  primary: '#1E8E3E',      // National Green (primary accent)
  primaryDark: '#0E5F3A',  // Government Green (logo/badge)
  secondary: '#1F2A37',    // Executive Slate
  accent: '#F4C430',       // Flag Yellow
  blue: '#2563EB',         // Info Blue (sparingly)
  teal: '#0EA5E9',         // Soft Teal
  gold: '#F4C430',         // Flag Yellow (warnings/status)
  gray: '#CBD5E1',         // Neutral Gray
  grayDark: '#6B7280',     // Muted text
  text: '#1F2937',         // Foreground text
  gridline: '#E5E7EB',     // Border
  background: '#F4F6F9',   // App background
  success: '#1E8E3E',      // Same as primary
  warning: '#F4C430',      // Flag Yellow
  error: '#D62828',        // National Red
  info: '#0EA5E9',         // Teal for info
};

// Chart color palettes for different chart types
export const CHART_PALETTES = {
  // For bar/column charts
  bars: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent, CHART_COLORS.teal, CHART_COLORS.primaryDark],
  
  // For line charts
  lines: {
    primary: CHART_COLORS.primary,
    secondary: CHART_COLORS.secondary,
    tertiary: CHART_COLORS.teal,
  },
  
  // For pie/donut charts
  pie: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent, CHART_COLORS.teal, CHART_COLORS.primaryDark, CHART_COLORS.grayDark],
  
  // Status-based colors
  status: {
    approved: CHART_COLORS.success,
    pending: CHART_COLORS.warning,
    rejected: CHART_COLORS.error,
    completed: CHART_COLORS.success,
    inProgress: CHART_COLORS.secondary,
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
    stroke: CHART_COLORS.grayDark,
    style: { fontSize: '12px', fill: CHART_COLORS.text },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: `1px solid ${CHART_COLORS.gridline}`,
      borderRadius: '8px',
      padding: '8px 12px',
    },
    labelStyle: {
      color: CHART_COLORS.text,
      fontWeight: '600',
    },
  },
};
