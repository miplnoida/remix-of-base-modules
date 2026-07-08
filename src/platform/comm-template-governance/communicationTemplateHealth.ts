/**
 * OM-9.7.6 — Communication Template Health checks.
 *
 * Non-mutating scan of the seeded catalogue (business events, tokens,
 * templates, text blocks) that returns COMM_TEMPLATE_* findings for the
 * Communication Template Health surface and release-readiness check.
 */
import { COMM_BUSINESS_EVENTS } from './businessEventCatalogue';
import { COMM_TEMPLATE_SEEDS, type CommTemplateSeed } from './templateSeedCatalogue';
import { COMM_TEXT_BLOCK_SEEDS } from './textBlockCatalogue';
import { extractTokens, isKnownToken } from './tokenCatalogue';

export type CommHealthSeverity = 'OK' | 'INFO' | 'WARNING' | 'BLOCKER';

export interface CommHealthFinding {
  code: string;
  severity: CommHealthSeverity;
  message: string;
  templateCode?: string;
  businessEventCode?: string;
  extras?: Record<string, unknown>;
}

export interface CommHealthReport {
  ran_at: string;
  totals: {
    templates: number;
    document: number;
    email: number;
    sms: number;
    inApp: number;
    notification: number;
    businessEventsCovered: number;
    businessEventsTotal: number;
    warnings: number;
    blockers: number;
    unknownTokens: number;
  };
  findings: CommHealthFinding[];
}

const KIND = {
  NO_BUSINESS_EVENT:              'COMM_TEMPLATE_NO_BUSINESS_EVENT',
  NO_CHANNEL:                     'COMM_TEMPLATE_NO_CHANNEL',
  NO_RECIPIENT_TYPE:              'COMM_TEMPLATE_NO_RECIPIENT_TYPE',
  UNKNOWN_TOKEN:                  'COMM_TEMPLATE_UNKNOWN_TOKEN',
  MISSING_REQUIRED_TOKEN:         'COMM_TEMPLATE_MISSING_REQUIRED_TOKEN',
  INACTIVE:                       'COMM_TEMPLATE_INACTIVE',
  EXPIRED:                        'COMM_TEMPLATE_EXPIRED',
  NO_EFFECTIVE_LETTERHEAD:        'COMM_TEMPLATE_NO_EFFECTIVE_LETTERHEAD',
  NO_EFFECTIVE_SIGNATURE:         'COMM_TEMPLATE_NO_EFFECTIVE_SIGNATURE',
  NO_EFFECTIVE_DISCLAIMER:        'COMM_TEMPLATE_NO_EFFECTIVE_DISCLAIMER',
  NO_EFFECTIVE_PRINT_FOOTER:      'COMM_TEMPLATE_NO_EFFECTIVE_PRINT_FOOTER',
  UNAPPROVED_ASSET:               'COMM_TEMPLATE_UNAPPROVED_ASSET',
  INACTIVE_ASSET:                 'COMM_TEMPLATE_INACTIVE_ASSET',
  EXPIRED_ASSET:                  'COMM_TEMPLATE_EXPIRED_ASSET',
  RENDER_CONTEXT_MISSING_TRACE:   'COMM_TEMPLATE_RENDER_CONTEXT_MISSING_SOURCE_TRACE',
  BUSINESS_EVENT_NO_DEFAULT:      'COMM_BUSINESS_EVENT_NO_DEFAULT_TEMPLATE',
  BUSINESS_MODULE_BYPASS:         'COMM_BUSINESS_MODULE_BYPASSES_RESOLVER',
  NOTIFICATION_TEMPLATE_DISABLED: 'COMM_NOTIFICATION_TEMPLATE_DISABLED',
  EMAIL_TEMPLATE_NO_HEADER:       'COMM_EMAIL_TEMPLATE_NO_HEADER',
  EMAIL_TEMPLATE_NO_FOOTER:       'COMM_EMAIL_TEMPLATE_NO_FOOTER',
  WAIVER_MIGRATE_NOW_REMAINING:   'COMM_WAIVER_MIGRATE_NOW_REMAINING',
} as const;

function scanTemplate(seed: CommTemplateSeed): CommHealthFinding[] {
  const findings: CommHealthFinding[] = [];
  if (!seed.business_event_code) {
    findings.push({ code: KIND.NO_BUSINESS_EVENT, severity: 'BLOCKER',
      templateCode: seed.template_code, message: 'Template has no business event.' });
  }
  if (!seed.output_channel) {
    findings.push({ code: KIND.NO_CHANNEL, severity: 'BLOCKER',
      templateCode: seed.template_code, message: 'Template has no output channel.' });
  }
  if (!seed.recipient_type) {
    findings.push({ code: KIND.NO_RECIPIENT_TYPE, severity: 'WARNING',
      templateCode: seed.template_code, message: 'Template has no recipient type.' });
  }
  if (!seed.is_active) {
    findings.push({ code: KIND.INACTIVE, severity: 'INFO',
      templateCode: seed.template_code, message: 'Template is inactive.' });
  }
  const parsed = extractTokens(seed.sample_body);
  const unknown = parsed.filter((t) => !isKnownToken(t));
  unknown.forEach((t) =>
    findings.push({ code: KIND.UNKNOWN_TOKEN, severity: 'WARNING',
      templateCode: seed.template_code, message: `Unknown token in body: {{${t}}}`, extras: { token: t } }),
  );
  const missingRequired = (seed.required_tokens ?? []).filter((t) => !parsed.includes(t));
  missingRequired.forEach((t) =>
    findings.push({ code: KIND.MISSING_REQUIRED_TOKEN, severity: 'WARNING',
      templateCode: seed.template_code, message: `Required token not present in body: {{${t}}}`, extras: { token: t } }),
  );
  return findings;
}

export function runCommunicationTemplateHealth(): CommHealthReport {
  const findings: CommHealthFinding[] = [];
  const covered = new Set<string>();

  for (const t of COMM_TEMPLATE_SEEDS) {
    findings.push(...scanTemplate(t));
    covered.add(t.business_event_code);
  }

  for (const evt of COMM_BUSINESS_EVENTS) {
    if (!covered.has(evt.code)) {
      findings.push({
        code: KIND.BUSINESS_EVENT_NO_DEFAULT,
        severity: 'INFO',
        businessEventCode: evt.code,
        message: `Business event ${evt.code} (${evt.moduleCode}) has no seeded starter template.`,
      });
    }
  }

  const totals = {
    templates: COMM_TEMPLATE_SEEDS.length,
    document: COMM_TEMPLATE_SEEDS.filter((t) => t.output_channel === 'DOCUMENT').length,
    email:    COMM_TEMPLATE_SEEDS.filter((t) => t.output_channel === 'EMAIL').length,
    sms:      COMM_TEMPLATE_SEEDS.filter((t) => t.output_channel === 'SMS').length,
    inApp:    COMM_TEMPLATE_SEEDS.filter((t) => t.output_channel === 'IN_APP').length,
    notification: COMM_TEMPLATE_SEEDS.filter((t) => ['EMAIL','SMS','IN_APP'].includes(t.output_channel)).length,
    businessEventsCovered: covered.size,
    businessEventsTotal: COMM_BUSINESS_EVENTS.length,
    warnings: findings.filter((f) => f.severity === 'WARNING').length,
    blockers: findings.filter((f) => f.severity === 'BLOCKER').length,
    unknownTokens: findings.filter((f) => f.code === KIND.UNKNOWN_TOKEN).length,
  };

  return { ran_at: new Date().toISOString(), totals, findings };
}

export const COMM_TEMPLATE_HEALTH_KIND = KIND;
export const COMM_TEXT_BLOCK_SEED_COUNT = COMM_TEXT_BLOCK_SEEDS.length;
