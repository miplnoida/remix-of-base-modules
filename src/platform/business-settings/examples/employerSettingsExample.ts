/**
 * Epic BM-SET-1 — Employer example adapter.
 *
 * Reference implementation for future business-module adapters. It contains
 * NO inheritance logic and NO raw table access — it only forwards to the
 * central business-module settings service.
 *
 * Copy this pattern for Insured Person, Contributions, Benefits, Compliance,
 * Legal, Finance, Reporting adapters.
 */
import {
  resolveRelevantSettingsForModule,
  resolveBusinessModuleCommunicationContext,
  previewBusinessModuleCommunication,
  validateBusinessModuleSettingsReadiness,
} from '../businessModuleSettingsService';
import type {
  BusinessModuleSettingsContext,
  BusinessModuleRelevantSettings,
  BusinessModuleReadinessResult,
} from '../businessModuleSettingsTypes';
import type {
  BusinessCommunicationInput,
  BusinessCommunicationContext,
} from '@/lib/comm/businessCommunicationResolver';

const MODULE: 'EMPLOYER' = 'EMPLOYER';

function withModule(ctx: Omit<BusinessModuleSettingsContext, 'moduleCode'>): BusinessModuleSettingsContext {
  return { ...ctx, moduleCode: MODULE };
}

export function resolveEmployerRelevantSettings(
  ctx: Omit<BusinessModuleSettingsContext, 'moduleCode'>,
): Promise<BusinessModuleRelevantSettings> {
  return resolveRelevantSettingsForModule(withModule(ctx));
}

export function resolveEmployerCommunicationContext(
  input: Omit<BusinessCommunicationInput, 'moduleCode'>,
): Promise<BusinessCommunicationContext> {
  return resolveBusinessModuleCommunicationContext({ ...input, moduleCode: MODULE });
}

export function previewEmployerCommunication(
  input: Omit<BusinessCommunicationInput, 'moduleCode'>,
): Promise<BusinessCommunicationContext> {
  return previewBusinessModuleCommunication({ ...input, moduleCode: MODULE });
}

export function validateEmployerSettingsReadiness(
  ctx: Omit<BusinessModuleSettingsContext, 'moduleCode'>,
  requiredSettingKeys?: string[],
): Promise<BusinessModuleReadinessResult> {
  return validateBusinessModuleSettingsReadiness(withModule(ctx), requiredSettingKeys);
}
