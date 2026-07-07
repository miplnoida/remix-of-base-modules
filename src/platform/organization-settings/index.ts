/**
 * Epic OM-6 — Public surface of the Organisation Settings inheritance model.
 *
 * Business modules and admin UI should import from here — NOT from raw
 * comm_* / core_template / core_department_profile tables.
 */
export * from './settingKeys';
export * from './inheritanceEvents';
export * from './effectiveSettingsResolver';
export * from './inheritanceHealth';
