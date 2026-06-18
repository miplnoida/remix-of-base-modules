/**
 * commonMasters — bundled reference data for Country Master form.
 *
 * Acts as the "common_country_master / common_currency_master /
 * common_language_master / common_locale_master / common_timezone_master"
 * source until/unless these are promoted to dedicated DB tables. All
 * lookups go through this module so swapping the backing store is a
 * one-file change.
 */

export interface CountryIso {
  iso2: string;          // also used as country_code
  iso3: string;
  numeric_code: string;
  name: string;
  phone_code: string;
  default_currency: string;
  default_timezone: string;
  default_locale: string;
  default_language: string;
}

export interface CurrencyMaster {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

export interface LanguageMaster {
  code: string;        // ISO 639-1
  name: string;
  is_active: boolean;
}

export interface LocaleMaster {
  code: string;        // e.g. en-KN
  name: string;
  language: string;
  country: string;
}

/** Curated set: Caribbean, North America, UK, EU + commonly-used. Extend as needed. */
export const COUNTRY_MASTER: CountryIso[] = [
  { iso2: 'KN', iso3: 'KNA', numeric_code: '659', name: 'Saint Kitts and Nevis', phone_code: '+1869', default_currency: 'XCD', default_timezone: 'America/St_Kitts', default_locale: 'en-KN', default_language: 'en' },
  { iso2: 'AG', iso3: 'ATG', numeric_code: '028', name: 'Antigua and Barbuda',   phone_code: '+1268', default_currency: 'XCD', default_timezone: 'America/Antigua',  default_locale: 'en-AG', default_language: 'en' },
  { iso2: 'DM', iso3: 'DMA', numeric_code: '212', name: 'Dominica',              phone_code: '+1767', default_currency: 'XCD', default_timezone: 'America/Dominica', default_locale: 'en-DM', default_language: 'en' },
  { iso2: 'GD', iso3: 'GRD', numeric_code: '308', name: 'Grenada',               phone_code: '+1473', default_currency: 'XCD', default_timezone: 'America/Grenada',  default_locale: 'en-GD', default_language: 'en' },
  { iso2: 'LC', iso3: 'LCA', numeric_code: '662', name: 'Saint Lucia',           phone_code: '+1758', default_currency: 'XCD', default_timezone: 'America/St_Lucia',  default_locale: 'en-LC', default_language: 'en' },
  { iso2: 'VC', iso3: 'VCT', numeric_code: '670', name: 'Saint Vincent and the Grenadines', phone_code: '+1784', default_currency: 'XCD', default_timezone: 'America/St_Vincent', default_locale: 'en-VC', default_language: 'en' },
  { iso2: 'AI', iso3: 'AIA', numeric_code: '660', name: 'Anguilla',              phone_code: '+1264', default_currency: 'XCD', default_timezone: 'America/Anguilla', default_locale: 'en-AI', default_language: 'en' },
  { iso2: 'MS', iso3: 'MSR', numeric_code: '500', name: 'Montserrat',            phone_code: '+1664', default_currency: 'XCD', default_timezone: 'America/Montserrat', default_locale: 'en-MS', default_language: 'en' },
  { iso2: 'BB', iso3: 'BRB', numeric_code: '052', name: 'Barbados',              phone_code: '+1246', default_currency: 'BBD', default_timezone: 'America/Barbados', default_locale: 'en-BB', default_language: 'en' },
  { iso2: 'TT', iso3: 'TTO', numeric_code: '780', name: 'Trinidad and Tobago',   phone_code: '+1868', default_currency: 'TTD', default_timezone: 'America/Port_of_Spain', default_locale: 'en-TT', default_language: 'en' },
  { iso2: 'JM', iso3: 'JAM', numeric_code: '388', name: 'Jamaica',               phone_code: '+1876', default_currency: 'JMD', default_timezone: 'America/Jamaica',  default_locale: 'en-JM', default_language: 'en' },
  { iso2: 'BS', iso3: 'BHS', numeric_code: '044', name: 'Bahamas',               phone_code: '+1242', default_currency: 'BSD', default_timezone: 'America/Nassau',   default_locale: 'en-BS', default_language: 'en' },
  { iso2: 'BZ', iso3: 'BLZ', numeric_code: '084', name: 'Belize',                phone_code: '+501',  default_currency: 'BZD', default_timezone: 'America/Belize',   default_locale: 'en-BZ', default_language: 'en' },
  { iso2: 'GY', iso3: 'GUY', numeric_code: '328', name: 'Guyana',                phone_code: '+592',  default_currency: 'GYD', default_timezone: 'America/Guyana',   default_locale: 'en-GY', default_language: 'en' },
  { iso2: 'US', iso3: 'USA', numeric_code: '840', name: 'United States',         phone_code: '+1',    default_currency: 'USD', default_timezone: 'America/New_York', default_locale: 'en-US', default_language: 'en' },
  { iso2: 'CA', iso3: 'CAN', numeric_code: '124', name: 'Canada',                phone_code: '+1',    default_currency: 'CAD', default_timezone: 'America/Toronto',  default_locale: 'en-CA', default_language: 'en' },
  { iso2: 'GB', iso3: 'GBR', numeric_code: '826', name: 'United Kingdom',        phone_code: '+44',   default_currency: 'GBP', default_timezone: 'Europe/London',    default_locale: 'en-GB', default_language: 'en' },
  { iso2: 'IE', iso3: 'IRL', numeric_code: '372', name: 'Ireland',               phone_code: '+353',  default_currency: 'EUR', default_timezone: 'Europe/Dublin',    default_locale: 'en-IE', default_language: 'en' },
  { iso2: 'IN', iso3: 'IND', numeric_code: '356', name: 'India',                 phone_code: '+91',   default_currency: 'INR', default_timezone: 'Asia/Kolkata',     default_locale: 'en-IN', default_language: 'en' },
  { iso2: 'AU', iso3: 'AUS', numeric_code: '036', name: 'Australia',             phone_code: '+61',   default_currency: 'AUD', default_timezone: 'Australia/Sydney', default_locale: 'en-AU', default_language: 'en' },
  { iso2: 'NZ', iso3: 'NZL', numeric_code: '554', name: 'New Zealand',           phone_code: '+64',   default_currency: 'NZD', default_timezone: 'Pacific/Auckland', default_locale: 'en-NZ', default_language: 'en' },
  { iso2: 'ZA', iso3: 'ZAF', numeric_code: '710', name: 'South Africa',          phone_code: '+27',   default_currency: 'ZAR', default_timezone: 'Africa/Johannesburg', default_locale: 'en-ZA', default_language: 'en' },
  { iso2: 'FR', iso3: 'FRA', numeric_code: '250', name: 'France',                phone_code: '+33',   default_currency: 'EUR', default_timezone: 'Europe/Paris',     default_locale: 'fr-FR', default_language: 'fr' },
  { iso2: 'DE', iso3: 'DEU', numeric_code: '276', name: 'Germany',               phone_code: '+49',   default_currency: 'EUR', default_timezone: 'Europe/Berlin',    default_locale: 'de-DE', default_language: 'de' },
  { iso2: 'ES', iso3: 'ESP', numeric_code: '724', name: 'Spain',                 phone_code: '+34',   default_currency: 'EUR', default_timezone: 'Europe/Madrid',    default_locale: 'es-ES', default_language: 'es' },
  { iso2: 'IT', iso3: 'ITA', numeric_code: '380', name: 'Italy',                 phone_code: '+39',   default_currency: 'EUR', default_timezone: 'Europe/Rome',      default_locale: 'it-IT', default_language: 'it' },
  { iso2: 'NL', iso3: 'NLD', numeric_code: '528', name: 'Netherlands',           phone_code: '+31',   default_currency: 'EUR', default_timezone: 'Europe/Amsterdam', default_locale: 'nl-NL', default_language: 'nl' },
  { iso2: 'BR', iso3: 'BRA', numeric_code: '076', name: 'Brazil',                phone_code: '+55',   default_currency: 'BRL', default_timezone: 'America/Sao_Paulo', default_locale: 'pt-BR', default_language: 'pt' },
  { iso2: 'MX', iso3: 'MEX', numeric_code: '484', name: 'Mexico',                phone_code: '+52',   default_currency: 'MXN', default_timezone: 'America/Mexico_City', default_locale: 'es-MX', default_language: 'es' },
];

export const CURRENCY_MASTER: CurrencyMaster[] = [
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$', decimal_places: 2 },
  { code: 'USD', name: 'US Dollar',             symbol: '$',   decimal_places: 2 },
  { code: 'CAD', name: 'Canadian Dollar',       symbol: 'C$',  decimal_places: 2 },
  { code: 'GBP', name: 'British Pound',         symbol: '£',   decimal_places: 2 },
  { code: 'EUR', name: 'Euro',                  symbol: '€',   decimal_places: 2 },
  { code: 'BBD', name: 'Barbadian Dollar',      symbol: 'Bds$', decimal_places: 2 },
  { code: 'TTD', name: 'Trinidad & Tobago Dollar', symbol: 'TT$', decimal_places: 2 },
  { code: 'JMD', name: 'Jamaican Dollar',       symbol: 'J$',  decimal_places: 2 },
  { code: 'BSD', name: 'Bahamian Dollar',       symbol: 'B$',  decimal_places: 2 },
  { code: 'BZD', name: 'Belize Dollar',         symbol: 'BZ$', decimal_places: 2 },
  { code: 'GYD', name: 'Guyanese Dollar',       symbol: 'G$',  decimal_places: 2 },
  { code: 'INR', name: 'Indian Rupee',          symbol: '₹',   decimal_places: 2 },
  { code: 'AUD', name: 'Australian Dollar',     symbol: 'A$',  decimal_places: 2 },
  { code: 'NZD', name: 'New Zealand Dollar',    symbol: 'NZ$', decimal_places: 2 },
  { code: 'ZAR', name: 'South African Rand',    symbol: 'R',   decimal_places: 2 },
  { code: 'BRL', name: 'Brazilian Real',        symbol: 'R$',  decimal_places: 2 },
  { code: 'MXN', name: 'Mexican Peso',          symbol: 'Mex$', decimal_places: 2 },
];

export const LANGUAGE_MASTER: LanguageMaster[] = [
  { code: 'en', name: 'English',    is_active: true },
  { code: 'fr', name: 'French',     is_active: true },
  { code: 'es', name: 'Spanish',    is_active: true },
  { code: 'pt', name: 'Portuguese', is_active: true },
  { code: 'de', name: 'German',     is_active: true },
  { code: 'it', name: 'Italian',    is_active: true },
  { code: 'nl', name: 'Dutch',      is_active: true },
];

/** Common locales — language-COUNTRY tags. */
export const LOCALE_MASTER: LocaleMaster[] = (() => {
  const seen = new Set<string>();
  const out: LocaleMaster[] = [];
  // Bare languages first
  for (const l of LANGUAGE_MASTER) {
    if (seen.has(l.code)) continue;
    seen.add(l.code);
    out.push({ code: l.code, name: l.name, language: l.code, country: '' });
  }
  // Country-scoped locales derived from country master
  for (const c of COUNTRY_MASTER) {
    const code = c.default_locale;
    if (seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name: `${c.default_language.toUpperCase()} (${c.name})`, language: c.default_language, country: c.iso2 });
  }
  return out;
})();

/** IANA timezones — uses runtime list when available, otherwise a static fallback. */
export const TIMEZONE_MASTER: string[] = (() => {
  try {
    // @ts-ignore — supportedValuesOf is ES2022
    if (typeof Intl?.supportedValuesOf === 'function') {
      // @ts-ignore
      return (Intl.supportedValuesOf('timeZone') as string[]).slice().sort();
    }
  } catch { /* ignore */ }
  return [
    'UTC',
    'America/St_Kitts','America/Antigua','America/Dominica','America/Grenada',
    'America/St_Lucia','America/St_Vincent','America/Anguilla','America/Montserrat',
    'America/Barbados','America/Port_of_Spain','America/Jamaica','America/Nassau',
    'America/Belize','America/Guyana','America/New_York','America/Toronto',
    'America/Mexico_City','America/Sao_Paulo','Europe/London','Europe/Dublin',
    'Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome','Europe/Amsterdam',
    'Asia/Kolkata','Australia/Sydney','Pacific/Auckland','Africa/Johannesburg',
  ].sort();
})();

/** Returns timezones likely relevant to a given country (prefix match on region). */
export function timezonesForCountry(iso2: string): string[] {
  const c = COUNTRY_MASTER.find(c => c.iso2 === iso2);
  if (!c) return TIMEZONE_MASTER;
  const region = c.default_timezone.split('/')[0];
  const hits = TIMEZONE_MASTER.filter(tz => tz.startsWith(region + '/'));
  return hits.length > 0 ? hits : TIMEZONE_MASTER;
}

export function findCountry(iso2: string): CountryIso | undefined {
  return COUNTRY_MASTER.find(c => c.iso2 === iso2);
}

export function findCurrency(code: string): CurrencyMaster | undefined {
  return CURRENCY_MASTER.find(c => c.code === code);
}

export function isValidIanaTimezone(tz: string): boolean {
  if (!tz) return false;
  if (TIMEZONE_MASTER.includes(tz)) return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch { return false; }
}

export function isValidLocale(code: string): boolean {
  if (!code) return false;
  if (LOCALE_MASTER.some(l => l.code === code)) return true;
  try {
    return Intl.getCanonicalLocales(code).length > 0;
  } catch { return false; }
}

export const FISCAL_MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' },   { value: 5, label: 'May' },      { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },   { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];
