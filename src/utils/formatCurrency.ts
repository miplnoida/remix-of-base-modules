/**
 * Format currency values consistently across the application
 * XCD (Eastern Caribbean Dollar) is the base/functional currency for all accounting.
 * All ledger postings, statutory reports, liability statements, and balances are in XCD.
 */

/**
 * Base currency constants
 */
export const BASE_CURRENCY = 'XCD';
export const BASE_CURRENCY_NAME = 'Eastern Caribbean Dollar';
export const BASE_CURRENCY_SYMBOL = 'XCD';

// Legacy constants for backward compatibility
export const CURRENCY_CODE = 'XCD';
export const CURRENCY_SYMBOL = 'XCD';

/**
 * Format amount in XCD (base currency)
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
 * Format currency amount without currency symbol
 */
export const formatCurrencyAmount = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format amount with explicit currency code
 */
export const formatWithCurrency = (amount: number, currencyCode: string = 'XCD'): string => {
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${currencyCode} ${formattedAmount}`;
};

/**
 * Format XCD amount (base currency) with explicit XCD label
 */
export const formatXCD = (amount: number): string => {
  return formatWithCurrency(amount, 'XCD');
};
