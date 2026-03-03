/**
 * Centralized status/color mapping utility.
 * ALL status badges, KPI cards, and colored indicators should use these
 * instead of hardcoded Tailwind color classes.
 *
 * Semantic mapping:
 *   success/active/approved  → primary (green)
 *   warning/pending          → accent (yellow)
 *   error/rejected/overdue   → destructive (red)
 *   info/secondary           → secondary (slate)
 *   neutral/default          → muted
 */

// ── Badge / pill classes ──────────────────────────────────────────
export const STATUS_BADGE: Record<string, string> = {
  // ── Positive ──
  active:     'bg-primary/10 text-primary',
  approved:   'bg-primary/10 text-primary',
  completed:  'bg-primary/10 text-primary',
  settled:    'bg-primary/10 text-primary',
  resolved:   'bg-primary/10 text-primary',
  verified:   'bg-primary/10 text-primary',
  balanced:   'bg-primary/10 text-primary',
  cleared:    'bg-primary/10 text-primary',
  paid:       'bg-primary/10 text-primary',
  success:    'bg-primary/10 text-primary',
  low:        'bg-primary/10 text-primary',

  // ── Warning / in-progress ──
  pending:    'bg-accent/30 text-accent-foreground',
  warning:    'bg-accent/30 text-accent-foreground',
  'in progress': 'bg-accent/30 text-accent-foreground',
  'in-progress': 'bg-accent/30 text-accent-foreground',
  partial:    'bg-accent/30 text-accent-foreground',
  medium:     'bg-accent/30 text-accent-foreground',
  review:     'bg-accent/30 text-accent-foreground',
  'under review': 'bg-accent/30 text-accent-foreground',
  delayed:    'bg-accent/30 text-accent-foreground',

  // ── Error / negative ──
  rejected:   'bg-destructive/10 text-destructive',
  overdue:    'bg-destructive/10 text-destructive',
  failed:     'bg-destructive/10 text-destructive',
  inactive:   'bg-destructive/10 text-destructive',
  returned:   'bg-destructive/10 text-destructive',
  high:       'bg-destructive/10 text-destructive',
  error:      'bg-destructive/10 text-destructive',
  'at risk':  'bg-destructive/10 text-destructive',

  // ── Informational / neutral ──
  info:       'bg-secondary/10 text-secondary-foreground',
  system:     'bg-secondary/10 text-secondary-foreground',
  mandatory:  'bg-secondary/10 text-secondary-foreground',
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
  success:  'text-primary',
  positive: 'text-primary',
  warning:  'text-accent-foreground',
  error:    'text-destructive',
  negative: 'text-destructive',
  info:     'text-secondary-foreground',
  neutral:  'text-muted-foreground',
};

export function getStatusTextClass(variant: string): string {
  return STATUS_TEXT[variant.toLowerCase()] ?? 'text-foreground';
}

// ── Icon accent color helpers ─────────────────────────────────────
export const ICON_COLOR: Record<string, string> = {
  primary:     'text-primary',
  success:     'text-primary',
  warning:     'text-accent-foreground',
  error:       'text-destructive',
  destructive: 'text-destructive',
  info:        'text-secondary-foreground',
  muted:       'text-muted-foreground',
};

// ── KPI card gradient presets ─────────────────────────────────────
export const KPI_GRADIENT: Record<string, string> = {
  primary:   'from-primary to-primary/80',
  secondary: 'from-secondary to-secondary/80',
  accent:    'from-accent to-accent/80',
  error:     'from-destructive to-destructive/80',
};

// ── Chart color tokens (HSL CSS vars for Recharts) ────────────────
export const CHART_HSL = {
  primary:     'hsl(var(--primary))',
  secondary:   'hsl(var(--secondary))',
  accent:      'hsl(var(--accent))',
  destructive: 'hsl(var(--destructive))',
  muted:       'hsl(var(--muted-foreground))',
  border:      'hsl(var(--border))',
};
