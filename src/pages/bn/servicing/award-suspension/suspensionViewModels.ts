/**
 * Central place to share layout tokens/labels across the Award Suspension
 * workspace. Keep this file free of react state and side-effects.
 */
export const AWARD_SUSPENSION_TABS = ['awards', 'requests', 'approvals', 'history'] as const;
export type AwardSuspensionTab = (typeof AWARD_SUSPENSION_TABS)[number];

/**
 * Dark-launch gate for the redesigned workspace. All mutating UI must be
 * disabled while this is false. Feature-flag defaults keep this off in
 * production; a follow-up epic will make this dynamic.
 */
export const ACTIONS_ENABLED = false as const;

export const formatMoney = (value: number | null | undefined, currency?: string | null): string => {
  if (value == null) return '—';
  const symbol = currency && currency.length <= 3 ? `${currency} ` : '$';
  return `${symbol}${Number(value).toFixed(2)}`;
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return String(iso);
  }
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
};

export const slaTone = (ageDays: number): 'ok' | 'warn' | 'breach' => {
  if (ageDays <= 2) return 'ok';
  if (ageDays <= 5) return 'warn';
  return 'breach';
};
