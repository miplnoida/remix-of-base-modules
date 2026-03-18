import { format, parseISO } from 'date-fns';

export const FORMAT_CONFIG = {
  dateDisplayFormat: import.meta.env.VITE_DATE_DISPLAY_FORMAT || 'dd/MM/yyyy',
  dateStorageFormat: import.meta.env.VITE_DATE_STORAGE_FORMAT || 'yyyy-MM-dd',
  phoneMask: import.meta.env.VITE_PHONE_MASK || 'XXX-XXX-XXXX',
  phoneDigitsLength: Number(import.meta.env.VITE_PHONE_DIGITS_LENGTH || 10),
  phoneDisplayFormat: import.meta.env.VITE_PHONE_DISPLAY_FORMAT || '(+{dialCode}) {phone}',
  defaultCountryCode: import.meta.env.VITE_DEFAULT_COUNTRY_CODE || 'KN',
  applicationExpiryDays: Number(import.meta.env.VITE_APPLICATION_EXPIRY_DAYS || 4),
  refNumberPrefix: import.meta.env.VITE_REF_NUMBER_PREFIX || 'IP-REG',
  refNumberDigits: Number(import.meta.env.VITE_REF_NUMBER_DIGITS || 6),
  minAgeApplicant: Number(import.meta.env.VITE_MIN_AGE_APPLICANT || 16),
  minAgeSpouse: Number(import.meta.env.VITE_MIN_AGE_SPOUSE || 16),
  maxNameLength: Number(import.meta.env.VITE_MAX_NAME_LENGTH || 30),
  maxEmailLength: Number(import.meta.env.VITE_MAX_EMAIL_LENGTH || 75),
  maxRemarksLength: Number(import.meta.env.VITE_MAX_REMARKS_LENGTH || 250),
  ssnLength: Number(import.meta.env.VITE_SSN_LENGTH || 6),
};

export function formatDateForDisplay(isoString: string): string {
  try {
    const date = parseISO(isoString);
    return format(date, FORMAT_CONFIG.dateDisplayFormat);
  } catch {
    return isoString;
  }
}

export function formatDateForStorage(date: Date): string {
  return format(date, FORMAT_CONFIG.dateStorageFormat);
}

export function getDatePlaceholder(): string {
  return FORMAT_CONFIG.dateDisplayFormat.toUpperCase();
}

export function applyPhoneMask(digits: string): string {
  const mask = FORMAT_CONFIG.phoneMask;
  let result = '';
  let digitIndex = 0;
  for (const char of mask) {
    if (char === 'X') {
      if (digitIndex < digits.length) {
        result += digits[digitIndex];
        digitIndex++;
      }
    } else {
      result += char;
    }
  }
  return result;
}

export function formatPhoneWithDialCode(dialCode: string, digits: string): string {
  const masked = applyPhoneMask(digits);
  return FORMAT_CONFIG.phoneDisplayFormat
    .replace('{dialCode}', dialCode)
    .replace('{phone}', masked);
}

export function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const digits = Array.from({ length: FORMAT_CONFIG.refNumberDigits }, () => Math.floor(Math.random() * 10)).join('');
  return `${FORMAT_CONFIG.refNumberPrefix}-${year}-${digits}`;
}

export function calculateExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + FORMAT_CONFIG.applicationExpiryDays);
  return date;
}

export function getExpiryDaysText(): string {
  return `${FORMAT_CONFIG.applicationExpiryDays} business days`;
}

export function getExpiryDays(): number {
  return FORMAT_CONFIG.applicationExpiryDays;
}
