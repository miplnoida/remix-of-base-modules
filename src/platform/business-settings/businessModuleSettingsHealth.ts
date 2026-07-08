/**
 * Epic BM-SET-1 — Business Module Settings health helpers.
 *
 * Small pure helpers that summarise an effective settings bundle into
 * user-friendly health messages. Kept separate from the service so callers
 * can render health cards without pulling audit / resolver dependencies.
 */
import type {
  BusinessModuleRelevantSettings,
  BusinessModuleHealthStatus,
} from './businessModuleSettingsTypes';

export interface BusinessModuleHealthSummary {
  status: BusinessModuleHealthStatus;
  headline: string;
  warnings: string[];
  missingRequiredSettings: string[];
}

export function summariseHealth(
  result: BusinessModuleRelevantSettings,
): BusinessModuleHealthSummary {
  let headline: string;
  switch (result.healthStatus) {
    case 'OK':      headline = 'All required communication settings are configured.'; break;
    case 'WARN':    headline = 'Communication settings have warnings. Please review before final generation.'; break;
    case 'ERROR':   headline = 'Communication settings have configuration errors.'; break;
    case 'MISSING': headline = 'This action cannot generate the communication because required settings are missing.'; break;
  }
  return {
    status: result.healthStatus,
    headline,
    warnings: result.warnings,
    missingRequiredSettings: result.missingRequiredSettings,
  };
}
