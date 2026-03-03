/**
 * Centralized status/color mapping utility.
 * ALL status badges, KPI cards, and colored indicators should use these
 * instead of hardcoded Tailwind color classes.
 *
 * Semantic mapping:
 *   success/active/approved  → success (green)
 *   warning/pending          → warning (amber)
 *   error/rejected/overdue   → destructive (red)
 *   info/secondary           → info (blue)
 *   neutral/default          → muted
 */

// ── Badge / pill classes ──────────────────────────────────────────
export const STATUS_BADGE: Record<string, string> = {
  // ── Positive ──
  active:     'bg-success/10 text-success',
  approved:   'bg-success/10 text-success',
  completed:  'bg-success/10 text-success',
  settled:    'bg-success/10 text-success',
  resolved:   'bg-success/10 text-success',
  verified:   'bg-success/10 text-success',
  balanced:   'bg-success/10 text-success',
  cleared:    'bg-success/10 text-success',
  paid:       'bg-success/10 text-success',
  success:    'bg-success/10 text-success',
  low:        'bg-success/10 text-success',

  // ── Warning / in-progress ──
  pending:    'bg-warning/15 text-warning',
  warning:    'bg-warning/15 text-warning',
  'in progress': 'bg-warning/15 text-warning',
  'in-progress': 'bg-warning/15 text-warning',
  partial:    'bg-warning/15 text-warning',
  medium:     'bg-warning/15 text-warning',
  review:     'bg-warning/15 text-warning',
  'under review': 'bg-warning/15 text-warning',
  delayed:    'bg-warning/15 text-warning',

  // ── Error / negative ──
  rejected:   'bg-destructive/10 text-destructive',
  overdue:    'bg-destructive/10 text-destructive',
  failed:     'bg-destructive/10 text-destructive',
  inactive:   'bg-destructive/10 text-destructive',
  returned:   'bg-destructive/10 text-destructive',
  high:       'bg-destructive/10 text-destructive',
  error:      'bg-destructive/10 text-destructive',
  'at risk':  'bg-destructive/10 text-destructive',

  // ── Informational ──
  info:       'bg-info/10 text-info',
  system:     'bg-info/10 text-info',
  mandatory:  'bg-info/10 text-info',

  // ── Neutral ──
  draft:      'bg-muted text-muted-foreground',
  custom:     'bg-muted text-muted-foreground',
  neutral:    'bg-muted text-muted-foreground',
  paused:     'bg-muted text-muted-foreground',
  withdrawn:  'bg-muted text-muted-foreground',
};

/**
 * Returns semantic badge classes for a given status string.
 * Case-insensitive. Falls back to `bg-muted text-muted-foreground`.
 */
export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE[status.toLowerCase()] ?? 'bg-muted text-muted-foreground';
}

// ── Text color helpers ────────────────────────────────────────────
export const STATUS_TEXT: Record<string, string> = {
  success:  'text-success',
  positive: 'text-success',
  warning:  'text-warning',
  error:    'text-destructive',
  negative: 'text-destructive',
  info:     'text-info',
  neutral:  'text-muted-foreground',
};

export function getStatusTextClass(variant: string): string {
  return STATUS_TEXT[variant.toLowerCase()] ?? 'text-foreground';
}

// ── Icon accent color helpers ─────────────────────────────────────
export const ICON_COLOR: Record<string, string> = {
  primary:     'text-primary',
  success:     'text-success',
  warning:     'text-warning',
  error:       'text-destructive',
  destructive: 'text-destructive',
  info:        'text-info',
  muted:       'text-muted-foreground',
};

// ── KPI card gradient presets ─────────────────────────────────────
export const KPI_GRADIENT: Record<string, string> = {
  primary:   'from-primary to-primary/80',
  secondary: 'from-secondary to-secondary/80',
  accent:    'from-accent to-accent/80',
  error:     'from-destructive to-destructive/80',
  info:      'from-info to-info/80',
  success:   'from-success to-success/80',
  warning:   'from-warning to-warning/80',
};

// ── Chart color tokens (HSL CSS vars for Recharts) ────────────────
export const CHART_HSL = {
  primary:     'hsl(var(--primary))',
  secondary:   'hsl(var(--secondary))',
  accent:      'hsl(var(--accent))',
  destructive: 'hsl(var(--destructive))',
  info:        'hsl(var(--info))',
  success:     'hsl(var(--success))',
  warning:     'hsl(var(--warning))',
  muted:       'hsl(var(--muted-foreground))',
  border:      'hsl(var(--border))',
};

// ── Contextual background + text combos ───────────────────────────
// Use these for alert boxes, info panels, highlighted sections
export const CONTEXTUAL_CLASSES = {
  info:        'bg-info/10 text-info border-info/20',
  success:     'bg-success/10 text-success border-success/20',
  warning:     'bg-warning/15 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  muted:       'bg-muted text-muted-foreground border-border',
};
