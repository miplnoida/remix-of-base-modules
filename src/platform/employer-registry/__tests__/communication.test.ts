/**
 * Employer Registry — BM-SET-1 adoption test.
 *
 * Ensures the Employer module consumes settings and communication only
 * through the central business-settings service adapter, and that the
 * required Employer business events are registered in the canonical
 * BUSINESS_EVENT_SETTINGS_REGISTRY.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  EMPLOYER_REGISTRY_BUSINESS_EVENTS,
  resolveEmployerRegistrySettings,
  resolveEmployerRegistryCommunication,
  previewEmployerRegistryCommunication,
  validateEmployerRegistryReadiness,
} from '../communication';
import { BUSINESS_EVENT_SETTINGS_REGISTRY } from '@/platform/business-settings/businessEventSettingsRegistry';

const FORBIDDEN_TABLES = [
  'comm_letterhead',
  'comm_email_signature',
  'comm_disclaimer',
  'comm_print_footer',
  'comm_text_block',
  'comm_asset',
  'notification_templates',
  'core_configuration_assignment',
  'core_department_profile',
];

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name) && !p.includes('__tests__')) acc.push(p);
  }
  return acc;
}

describe('Employer Registry — BM-SET-1 adoption', () => {
  it('exposes canonical business event codes', () => {
    expect(EMPLOYER_REGISTRY_BUSINESS_EVENTS.registryCreated).toBe('EMPLOYER_REGISTRY_CREATED');
    expect(EMPLOYER_REGISTRY_BUSINESS_EVENTS.registryDeactivated).toBe('EMPLOYER_REGISTRY_DEACTIVATED');
    expect(EMPLOYER_REGISTRY_BUSINESS_EVENTS.statusChanged).toBe('EMPLOYER_STATUS_CHANGED');
  });

  it('registers every Employer Registry business event in the central registry', () => {
    for (const code of Object.values(EMPLOYER_REGISTRY_BUSINESS_EVENTS)) {
      const found = BUSINESS_EVENT_SETTINGS_REGISTRY.find(
        (r) => r.moduleCode === 'EMPLOYER' && r.businessEventCode === code,
      );
      expect(found, `Missing registry entry for ${code}`).toBeDefined();
      expect(found!.requiredSettings.length).toBeGreaterThan(0);
    }
  });

  it('exposes only thin forwarders (no local resolver logic)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/platform/employer-registry/communication.ts'),
      'utf8',
    );
    // Must forward to the central service.
    expect(src).toMatch(/businessModuleSettingsService/);
    // Must NOT query any raw comm/config table.
    for (const t of FORBIDDEN_TABLES) {
      expect(
        src.includes(`.from('${t}')`) || src.includes(`.from("${t}")`),
        `communication.ts queries forbidden table ${t}`,
      ).toBe(false);
    }

  });

  it('Employer Registry module code does not read raw comm / config tables', () => {
    const files = walk(join(process.cwd(), 'src/platform/employer-registry'));
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const t of FORBIDDEN_TABLES) {
        // Allow the tables to appear only as forbidden-list literals in tests (already excluded).
        expect(
          content.includes(`.from('${t}')`) || content.includes(`.from("${t}")`),
          `${file} reads forbidden table ${t}`,
        ).toBe(false);
      }
    }
  });

  it('exports the required adapter surface', () => {
    expect(typeof resolveEmployerRegistrySettings).toBe('function');
    expect(typeof resolveEmployerRegistryCommunication).toBe('function');
    expect(typeof previewEmployerRegistryCommunication).toBe('function');
    expect(typeof validateEmployerRegistryReadiness).toBe('function');
  });
});
