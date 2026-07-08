/**
 * OM-9.7.6 — Communication Template Governance resolver + catalogue tests.
 *
 * These tests verify the deterministic pieces we ship in source: the
 * business-event catalogue, token catalogue, template seed catalogue, and
 * the health scan. Full DB-backed resolver tests live alongside the
 * `businessCommunicationResolver` integration suite.
 */
import { describe, it, expect } from 'vitest';
import {
  COMM_BUSINESS_EVENTS,
  businessEventsByModule,
  findBusinessEvent,
} from '@/platform/comm-template-governance/businessEventCatalogue';
import {
  COMM_TOKEN_CATALOGUE,
  extractTokens,
  isKnownToken,
  validateTemplateTokens,
} from '@/platform/comm-template-governance/tokenCatalogue';
import { COMM_TEMPLATE_SEEDS } from '@/platform/comm-template-governance/templateSeedCatalogue';
import { COMM_TEXT_BLOCK_SEEDS } from '@/platform/comm-template-governance/textBlockCatalogue';
import { runCommunicationTemplateHealth } from '@/platform/comm-template-governance/communicationTemplateHealth';

describe('OM-9.7.6 Communication Template Governance', () => {
  describe('business event catalogue', () => {
    it('covers every required SSB module', () => {
      const modules = new Set(COMM_BUSINESS_EVENTS.map((e) => e.moduleCode));
      for (const m of ['EMPLOYER','INSURED_PERSON','CONTRIBUTIONS','BENEFITS','COMPLIANCE','FINANCE','LEGAL','WORKFLOW','ADMIN']) {
        expect(modules.has(m as any)).toBe(true);
      }
    });
    it('has unique event codes', () => {
      const codes = COMM_BUSINESS_EVENTS.map((e) => e.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
    it('resolves specific events by code', () => {
      expect(findBusinessEvent('EMPLOYER_REGISTRATION_APPROVED')?.moduleCode).toBe('EMPLOYER');
      expect(findBusinessEvent('BENEFIT_CLAIM_APPROVED')?.moduleCode).toBe('BENEFITS');
      expect(findBusinessEvent('DOES_NOT_EXIST')).toBeUndefined();
    });
    it('groups by module', () => {
      expect(businessEventsByModule('EMPLOYER').length).toBeGreaterThan(0);
    });
  });

  describe('token catalogue', () => {
    it('contains the core organization + recipient + workflow tokens', () => {
      const keys = new Set(COMM_TOKEN_CATALOGUE.map((t) => t.token_key));
      ['organization.name','recipient.name','current.date','workflow.taskName','claim.number','employer.number']
        .forEach((k) => expect(keys.has(k)).toBe(true));
    });
    it('extracts tokens from bodies', () => {
      expect(extractTokens('Hi {{recipient.name}} on {{current.date}}')).toEqual(
        expect.arrayContaining(['recipient.name','current.date']),
      );
    });
    it('flags unknown tokens', () => {
      const r = validateTemplateTokens('Hello {{foo.bar}} and {{recipient.name}}');
      expect(r.unknownTokens).toEqual(['foo.bar']);
      expect(r.isValid).toBe(false);
    });
    it('flags missing required tokens', () => {
      const r = validateTemplateTokens('Static body', ['recipient.name']);
      expect(r.missingRequired).toEqual(['recipient.name']);
    });
    it('validates a clean body against required tokens', () => {
      const r = validateTemplateTokens('Hi {{recipient.name}}', ['recipient.name']);
      expect(r.isValid).toBe(true);
    });
    it('isKnownToken respects the catalogue', () => {
      expect(isKnownToken('organization.name')).toBe(true);
      expect(isKnownToken('not.a.token')).toBe(false);
    });
  });

  describe('template seed catalogue', () => {
    it('seeds a DOCUMENT + EMAIL + SMS for EMPLOYER_REGISTRATION_APPROVED', () => {
      const set = COMM_TEMPLATE_SEEDS.filter((t) => t.business_event_code === 'EMPLOYER_REGISTRATION_APPROVED');
      const channels = new Set(set.map((t) => t.output_channel));
      ['DOCUMENT','EMAIL','SMS'].forEach((c) => expect(channels.has(c as any)).toBe(true));
    });
    it('seeds a DOCUMENT + EMAIL + SMS for BENEFIT_CLAIM_APPROVED', () => {
      const set = COMM_TEMPLATE_SEEDS.filter((t) => t.business_event_code === 'BENEFIT_CLAIM_APPROVED');
      const channels = new Set(set.map((t) => t.output_channel));
      ['DOCUMENT','EMAIL','SMS'].forEach((c) => expect(channels.has(c as any)).toBe(true));
    });
    it('seeds a WORKFLOW_TASK_ASSIGNED email + in-app pair', () => {
      const set = COMM_TEMPLATE_SEEDS.filter((t) => t.business_event_code === 'WORKFLOW_TASK_ASSIGNED');
      const channels = new Set(set.map((t) => t.output_channel));
      ['EMAIL','IN_APP'].forEach((c) => expect(channels.has(c as any)).toBe(true));
    });
    it('every seed has a business event code and channel', () => {
      for (const t of COMM_TEMPLATE_SEEDS) {
        expect(t.business_event_code).toBeTruthy();
        expect(t.output_channel).toBeTruthy();
        expect(t.recipient_type).toBeTruthy();
      }
    });
    it('every seed body only uses known tokens', () => {
      for (const t of COMM_TEMPLATE_SEEDS) {
        const r = validateTemplateTokens(t.sample_body);
        expect(r.unknownTokens, `unknown tokens in ${t.template_code}: ${r.unknownTokens.join(',')}`).toEqual([]);
      }
    });
  });

  describe('text block catalogue', () => {
    it('seeds the standard reusable blocks', () => {
      const codes = new Set(COMM_TEXT_BLOCK_SEEDS.map((b) => b.code));
      ['STANDARD_CONTACT_INSTRUCTION','STANDARD_DISCLAIMER','STANDARD_SMS_FOOTER','STANDARD_EMAIL_FOOTER_NOTE']
        .forEach((c) => expect(codes.has(c)).toBe(true));
    });
  });

  describe('template health scan', () => {
    it('returns a report with totals + findings shape', () => {
      const r = runCommunicationTemplateHealth();
      expect(r.totals.templates).toBe(COMM_TEMPLATE_SEEDS.length);
      expect(r.totals.businessEventsTotal).toBe(COMM_BUSINESS_EVENTS.length);
      expect(Array.isArray(r.findings)).toBe(true);
      expect(r.totals.blockers).toBe(0);
    });
    it('flags business events with no seeded template as INFO', () => {
      const r = runCommunicationTemplateHealth();
      const evtWithoutSeed = COMM_BUSINESS_EVENTS.find(
        (e) => !COMM_TEMPLATE_SEEDS.some((t) => t.business_event_code === e.code),
      );
      if (evtWithoutSeed) {
        expect(
          r.findings.some(
            (f) => f.code === 'COMM_BUSINESS_EVENT_NO_DEFAULT_TEMPLATE' &&
                   f.businessEventCode === evtWithoutSeed.code,
          ),
        ).toBe(true);
      }
    });
  });
});
