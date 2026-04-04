/**
 * BN Status Badge — Configuration-driven status rendering
 * Maps claim/product statuses to semantic badge variants and colors
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeColorScheme = {
  bg: string;
  text: string;
  border: string;
};

const STATUS_SCHEMES: Record<string, BadgeColorScheme> = {
  // Claim lifecycle
  DRAFT:             { bg: 'bg-muted',            text: 'text-muted-foreground', border: 'border-border' },
  SUBMITTED:         { bg: 'bg-blue-500/10',      text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  INTAKE_REVIEW:     { bg: 'bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20' },
  ELIGIBILITY_CHECK: { bg: 'bg-violet-500/10',    text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-500/20' },
  EVIDENCE_REVIEW:   { bg: 'bg-orange-500/10',    text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/20' },
  CALCULATION:       { bg: 'bg-cyan-500/10',       text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-500/20' },
  DECISION:          { bg: 'bg-indigo-500/10',     text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-500/20' },
  APPROVED:          { bg: 'bg-emerald-500/10',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
  DENIED:            { bg: 'bg-destructive/10',    text: 'text-destructive', border: 'border-destructive/20' },
  SUSPENDED:         { bg: 'bg-destructive/10',    text: 'text-destructive', border: 'border-destructive/20' },
  CLOSED:            { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  PENDING_INFO:      { bg: 'bg-yellow-500/10',     text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-500/20' },
  WITHDRAWN:         { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  AWARD_SETUP:       { bg: 'bg-emerald-500/10',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
  PAYMENT_QUEUE:     { bg: 'bg-teal-500/10',       text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500/20' },
  IN_PAYMENT:        { bg: 'bg-green-500/10',      text: 'text-green-700 dark:text-green-400', border: 'border-green-500/20' },
  // Product lifecycle
  ACTIVE:            { bg: 'bg-emerald-500/10',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
  PENDING_APPROVAL:  { bg: 'bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20' },
  ARCHIVED:          { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  // Priority
  LOW:               { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  NORMAL:            { bg: 'bg-blue-500/10',       text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  HIGH:              { bg: 'bg-orange-500/10',      text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/20' },
  URGENT:            { bg: 'bg-destructive/10',     text: 'text-destructive', border: 'border-destructive/20' },
  // Evidence
  RECEIVED:          { bg: 'bg-blue-500/10',       text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  VERIFIED:          { bg: 'bg-emerald-500/10',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
  REJECTED:          { bg: 'bg-destructive/10',    text: 'text-destructive', border: 'border-destructive/20' },
  WAIVED:            { bg: 'bg-violet-500/10',     text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-500/20' },
  EXPIRED:           { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  // Payable statuses
  READY:             { bg: 'bg-emerald-500/10',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
  BLOCKED:           { bg: 'bg-destructive/10',    text: 'text-destructive', border: 'border-destructive/20' },
  HELD:              { bg: 'bg-amber-500/10',      text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20' },
  EXCEPTION:         { bg: 'bg-orange-500/10',     text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/20' },
  SCHEDULED:         { bg: 'bg-blue-500/10',       text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  ISSUED_PENDING:    { bg: 'bg-teal-500/10',       text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500/20' },
  CANCELLED:         { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  REISSUE_PENDING:   { bg: 'bg-violet-500/10',     text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-500/20' },
  // Schedule statuses
  PROJECTED:         { bg: 'bg-sky-500/10',        text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-500/20' },
  DUE:               { bg: 'bg-amber-500/10',      text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20' },
  GENERATED:         { bg: 'bg-emerald-500/10',    text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
  SKIPPED:           { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  ARREARS:           { bg: 'bg-violet-500/10',     text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-500/20' },
  ADJUSTED:          { bg: 'bg-cyan-500/10',       text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-500/20' },
  EXHAUSTED:         { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
  TERMINATED:        { bg: 'bg-destructive/10',    text: 'text-destructive', border: 'border-destructive/20' },
  REOPENED:          { bg: 'bg-blue-500/10',       text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  // Batch statuses
  OPEN:              { bg: 'bg-blue-500/10',       text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  RELEASED:          { bg: 'bg-teal-500/10',       text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500/20' },
  ISSUED:            { bg: 'bg-green-500/10',      text: 'text-green-700 dark:text-green-400', border: 'border-green-500/20' },
  PARTIALLY_ISSUED:  { bg: 'bg-orange-500/10',     text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/20' },
  // Batch item statuses
  INCLUDED:          { bg: 'bg-blue-500/10',       text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/20' },
  FAILED_VALIDATION: { bg: 'bg-destructive/10',    text: 'text-destructive', border: 'border-destructive/20' },
  ISSUE_FAILED:      { bg: 'bg-destructive/10',    text: 'text-destructive', border: 'border-destructive/20' },
  REMOVED:           { bg: 'bg-muted',             text: 'text-muted-foreground', border: 'border-border' },
};

const DEFAULT_SCHEME: BadgeColorScheme = {
  bg: 'bg-secondary', text: 'text-secondary-foreground', border: 'border-secondary',
};

interface BnStatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const BnStatusBadge: React.FC<BnStatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  dot = false,
  className,
}) => {
  const scheme = STATUS_SCHEMES[status] || DEFAULT_SCHEME;
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        scheme.bg, scheme.text, scheme.border,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', scheme.text.replace('text-', 'bg-').split(' ')[0])} />
      )}
      {displayLabel}
    </span>
  );
};
