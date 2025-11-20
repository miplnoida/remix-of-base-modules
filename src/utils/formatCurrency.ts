/**
 * Format currency values consistently across the application
 * Uses XCD (East Caribbean Dollar) as the standard currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'XCD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format currency without currency symbol
 */
export const formatCurrencyAmount = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Currency code constant
 */
export const CURRENCY_CODE = 'XCD';

/**
 * Currency symbol constant
 */
export const CURRENCY_SYMBOL = 'XCD';
