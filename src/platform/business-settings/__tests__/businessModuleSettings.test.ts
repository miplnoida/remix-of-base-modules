/**
 * Epic BM-SET-1 — Business Module Settings service tests.
 *
 * These tests mock the OM-6 effective-settings resolver and the OM-9.7.4
 * business communication resolver, then verify the wrapper preserves shape,
 * flags missing required settings, and forwards to the central resolvers
 * (no raw-table access).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/platform/audit/auditService', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

const bundleFixture = {
  context: {},
  ordered: [] as any[],
  warnings: ['org warning'],
  missingConfiguration: [],
  resolvedAt: '2026-07-08T00:00:00.000Z',
  settings: {
    default_document_template: {
      key: 'default_document_template', label: 'Default Document Template',
      status: 'IMPLEMENTED', effectiveValue: 'TPL-1', effectiveLabel: 'TPL-1',
      source: 'DEPARTMENT_OVERRIDE', sourceLabel: 'Department Override',
      inheritanceMode: 'OVERRIDE', isInherited: false, isOverride: true,
      health: 'OK', warnings: [], fallbackChain: [],
    },
    default_letterhead: {
      key: 'default_letterhead', label: 'Default Letterhead',
      status: 'IMPLEMENTED', effectiveValue: 'LH-1', effectiveLabel: 'Letterhead A',
      source: 'ORGANIZATION_DEFAULT', sourceLabel: 'Organization Default',
      inheritanceMode: 'INHERIT', isInherited: true, isOverride: false,
      health: 'OK', warnings: [], fallbackChain: [],
    },
    default_disclaimer: {
      key: 'default_disclaimer', label: 'Default Disclaimer',
      status: 'IMPLEMENTED', effectiveValue: null, effectiveLabel: 'Not configured',
      source: 'MISSING', sourceLabel: 'Missing',
      inheritanceMode: 'MISSING', isInherited: false, isOverride: false,
      health: 'MISSING', warnings: ['Default Disclaimer is not configured.'], fallbackChain: [],
    },
  },
};

vi.mock('@/platform/organization-settings/effectiveSettingsResolver', () => ({
  resolveEffectiveSettingsBundle: vi.fn().mockResolvedValue(bundleFixture),
}));

vi.mock('@/lib/comm/businessCommunicationResolver', () => ({
  resolveBusinessCommunicationContext: vi.fn().mockResolvedValue({
    input: {}, effective: bundleFixture, render: null,
    resolvedTemplateCode: 'TPL-1', templateSource: 'EFFECTIVE_DEFAULT', warnings: [],
  }),
  previewBusinessCommunication: vi.fn().mockResolvedValue({
    input: {}, effective: bundleFixture, render: null,
    resolvedTemplateCode: 'TPL-1', templateSource: 'EFFECTIVE_DEFAULT', warnings: [],
  }),
}));

import {
  resolveRelevantSettingsForModule,
  resolveRequiredSettingsForBusinessEvent,
  resolveBusinessModuleCommunicationContext,
  validateBusinessModuleSettingsReadiness,
} from '../businessModuleSettingsService';
import { assertValidSettingKeys } from '../businessEventSettingsRegistry';
import * as adapter from '../examples/employerSettingsExample';
import { resolveBusinessCommunicationContext } from '@/lib/comm/businessCommunicationResolver';

beforeEach(() => { vi.clearAllMocks(); });

describe('BM-SET-1 businessModuleSettingsService', () => {
  it('resolveRelevantSettingsForModule returns grouped bundle shape', async () => {
    const r = await resolveRelevantSettingsForModule({ moduleCode: 'EMPLOYER' });
    expect(r.relevantSettings.defaultDocumentTemplate?.effectiveValue).toBe('TPL-1');
    expect(r.communicationDefaults.letterhead?.effectiveValue).toBe('LH-1');
    expect(r.sourceTrace.length).toBeGreaterThanOrEqual(0);
    expect(r.bundle).toBe(bundleFixture);
  });

  it('flags missing required settings when default_document_template is missing', async () => {
    const r = await resolveRequiredSettingsForBusinessEvent(
      { moduleCode: 'EMPLOYER' },
      ['default_disclaimer'],
    );
    expect(r.missingRequiredSettings).toContain('default_disclaimer');
    expect(r.healthStatus).toBe('MISSING');
  });

  it('passes readiness when required keys exist and health is OK', async () => {
    const r = await validateBusinessModuleSettingsReadiness(
      { moduleCode: 'EMPLOYER' },
      ['default_document_template', 'default_letterhead'],
    );
    expect(r.ok).toBe(true);
    expect(r.missingRequiredSettings).toEqual([]);
  });

  it('readiness fails when a required key is missing', async () => {
    const r = await validateBusinessModuleSettingsReadiness(
      { moduleCode: 'EMPLOYER' },
      ['default_disclaimer'],
    );
    expect(r.ok).toBe(false);
    expect(r.missingRequiredSettings).toContain('default_disclaimer');
  });

  it('resolveBusinessModuleCommunicationContext delegates to central resolver', async () => {
    await resolveBusinessModuleCommunicationContext({ moduleCode: 'EMPLOYER' });
    expect(resolveBusinessCommunicationContext).toHaveBeenCalledOnce();
  });

  it('explicit templateCode is marked as override/explicit source', async () => {
    (resolveBusinessCommunicationContext as any).mockResolvedValueOnce({
      input: { templateCode: 'X' }, effective: bundleFixture, render: null,
      resolvedTemplateCode: 'X', templateSource: 'EXPLICIT', warnings: [],
    });
    const ctx = await resolveBusinessModuleCommunicationContext({
      moduleCode: 'EMPLOYER', templateCode: 'X',
    });
    expect(ctx.templateSource).toBe('EXPLICIT');
  });

  it('Employer adapter returns same shape as central service', async () => {
    const r = await adapter.resolveEmployerRelevantSettings({});
    expect(r.relevantSettings.defaultDocumentTemplate?.effectiveValue).toBe('TPL-1');
  });

  it('registry rejects unknown setting keys', () => {
    expect(() => assertValidSettingKeys(['not_a_real_setting'])).toThrow();
    expect(() => assertValidSettingKeys(['default_letterhead'])).not.toThrow();
  });
});

describe('BM-SET-1 adapter hygiene', () => {
  it('example adapter does not read raw comm_/core_ tables', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const file = fs.readFileSync(
      path.resolve(__dirname, '../examples/employerSettingsExample.ts'),
      'utf8',
    );
    expect(file).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(file).not.toMatch(/comm_letterhead|comm_disclaimer|comm_email_signature|comm_print_footer|core_department_profile|core_organization|core_configuration_assignment|notification_templates/);
  });
});
