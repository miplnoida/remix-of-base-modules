/**
 * Currency Conversion Utilities
 * 
 * XCD (Eastern Caribbean Dollar) is the base/functional currency for all accounting.
 * All ledger postings, statutory reports, liability statements, and balances are in XCD.
 * Foreign currency transactions are converted to XCD using applicable exchange rates.
 */

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
}

export interface CurrencyTransaction {
  transactionCurrency: string;
  transactionAmount: number;
  xcdAmount: number;
  exchangeRate: number;
  rateDate: string;
}

// Base currency constant
export const BASE_CURRENCY = 'XCD';
export const BASE_CURRENCY_SYMBOL = 'XCD';
export const BASE_CURRENCY_NAME = 'Eastern Caribbean Dollar';

// Mock exchange rates (in production, fetch from database)
const mockExchangeRates: ExchangeRate[] = [
  { fromCurrency: 'USD', toCurrency: 'XCD', rate: 2.70, effectiveDate: '2024-01-01' },
  { fromCurrency: 'EUR', toCurrency: 'XCD', rate: 3.10, effectiveDate: '2024-01-01' },
  { fromCurrency: 'GBP', toCurrency: 'XCD', rate: 3.45, effectiveDate: '2024-01-01' },
  { fromCurrency: 'CAD', toCurrency: 'XCD', rate: 2.05, effectiveDate: '2024-01-01' },
];

/**
 * Get exchange rate from foreign currency to XCD for a specific date
 */
export const getExchangeRate = (
  fromCurrency: string,
  transactionDate: string = new Date().toISOString()
): number => {
  // If already in base currency, return 1
  if (fromCurrency === BASE_CURRENCY) {
    return 1.0;
  }

  // Find applicable rate (in production, query based on transaction date)
  const rate = mockExchangeRates.find(
    r => r.fromCurrency === fromCurrency && r.toCurrency === BASE_CURRENCY
  );

  if (!rate) {
    throw new Error(`No exchange rate found for ${fromCurrency} to ${BASE_CURRENCY}`);
  }

  return rate.rate;
};

/**
 * Convert foreign currency amount to XCD (base currency)
 */
export const convertToXCD = (
  amount: number,
  fromCurrency: string,
  transactionDate?: string
): CurrencyTransaction => {
  const exchangeRate = getExchangeRate(fromCurrency, transactionDate);
  const xcdAmount = amount * exchangeRate;

  return {
    transactionCurrency: fromCurrency,
    transactionAmount: amount,
    xcdAmount: xcdAmount,
    exchangeRate: exchangeRate,
    rateDate: transactionDate || new Date().toISOString()
  };
};

/**
 * Convert XCD amount to foreign currency
 */
export const convertFromXCD = (
  xcdAmount: number,
  toCurrency: string,
  transactionDate?: string
): CurrencyTransaction => {
  const exchangeRate = getExchangeRate(toCurrency, transactionDate);
  const foreignAmount = xcdAmount / exchangeRate;

  return {
    transactionCurrency: toCurrency,
    transactionAmount: foreignAmount,
    xcdAmount: xcdAmount,
    exchangeRate: exchangeRate,
    rateDate: transactionDate || new Date().toISOString()
  };
};

/**
 * Format currency with appropriate symbol and decimal places
 */
export const formatCurrencyWithCode = (
  amount: number,
  currencyCode: string,
  showCurrencyCode: boolean = true
): string => {
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (showCurrencyCode) {
    return `${currencyCode} ${formattedAmount}`;
  }

  return formattedAmount;
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  const symbols: Record<string, string> = {
    XCD: 'XCD',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$'
  };

  return symbols[currencyCode] || currencyCode;
};

/**
 * Validate if currency is supported
 */
export const isCurrencySupported = (currencyCode: string): boolean => {
  if (currencyCode === BASE_CURRENCY) return true;
  return mockExchangeRates.some(r => r.fromCurrency === currencyCode);
};

/**
 * Get list of all supported currencies
 */
export const getSupportedCurrencies = (): string[] => {
  const currencies = new Set<string>([BASE_CURRENCY]);
  mockExchangeRates.forEach(r => currencies.add(r.fromCurrency));
  return Array.from(currencies);
};
