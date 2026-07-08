#!/usr/bin/env tsx
/**
 * OM-9.7.5A — Communication Governance CI Gate.
 *
 * Scans runtime business-module code for direct reads of communication
 * asset/template tables that must instead go through the canonical
 * resolver `resolveBusinessCommunicationContext` (or approved wrappers
 * in `src/lib/enterprise/*` and `src/lib/comm/*`).
 *
 * Classifications:
 *   ALLOWED_CANONICAL_RESOLVER      — the resolver itself
 *   ALLOWED_ADMIN_CONFIG            — admin/config surfaces
 *   ALLOWED_GOVERNANCE              — governance/registry code
 *   ALLOWED_HEALTH_SCAN             — health check scanners
 *   ALLOWED_MIGRATION_COMPATIBILITY — migrations, scripts, edge functions
 *   RUNTIME_BYPASS_WARNING          — soft signal (token-only match, e.g. `template_code`)
 *   RUNTIME_BYPASS_BLOCKER          — hard direct-table read from a business module
 *
 * Exits 1 when any RUNTIME_BYPASS_BLOCKER is found.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

// ── Allow-lists ─────────────────────────────────────────────────────────────
const ALLOW_CANONICAL_RESOLVER = [
  'src/lib/comm/',
  'src/lib/enterprise/',
  'src/lib/configuration/',
  'src/services/coreTemplateResolverService.ts',
  'src/services/coreDocumentGenerationService.ts',
];

const ALLOW_ADMIN_CONFIG = [
  'src/pages/admin/',
  'src/components/admin/',
  'src/components/comm/',
  'src/components/organization/',
  'src/hooks/comm/',
  // Template management admin CRUD services (they own the tables).
  'src/services/coreTemplateService.ts',
  'src/platform/communication-template/',
];

const ALLOW_GOVERNANCE = [
  'src/platform/brand-assets/',
  'src/platform/organization-settings/',
  'src/platform/audit/',
  'src/platform/rbac/',
  'src/platform/release-readiness/',
  'src/platform/reference/',
  'src/platform/table-registry/',
  'src/platform/communication-template/',
];

const ALLOW_HEALTH_SCAN = [
  'src/lib/enterprise/healthChecks.ts',
  'src/platform/brand-assets/assetHealthChecks.ts',
  'src/platform/organization-settings/inheritanceHealth.ts',
];

/**
 * Documented pre-existing runtime consumers awaiting migration to
 * `resolveBusinessCommunicationContext` / `resolveNotification`.
 * Downgraded from BLOCKER to WARNING with a written waiver so the CI gate
 * still catches any NEW bypass without breaking today's build.
 * Remove entries here as each caller is migrated.
 */
const KNOWN_WAIVERS: Record<string, string> = {
  'src/services/auditPublicSubmissionNotifyService.ts': 'OM-9.7.5A waiver: migrate to resolveNotification()',
  'src/services/bn/bnNotificationIntegrationService.ts': 'OM-9.7.5A waiver: BN adapter migration pending',
  'src/services/bn/communication/bnCommunicationAdapter.ts': 'OM-9.7.5A waiver: BN adapter migration pending',
  'src/services/bn/communication/bnLetterRenderer.ts': 'OM-9.7.5A waiver: BN renderer migration pending',
  'src/services/compliance/planExceptionNotifier.ts': 'OM-9.7.5A waiver: compliance notifier migration pending',
  'src/services/iaNotificationService.ts': 'OM-9.7.5A waiver: IA notification migration pending',
  'src/services/legal/lgDocumentAutomationService.ts': 'OM-9.7.5A waiver: legal doc automation migration pending',
  'src/services/legal/lgStageTemplateService.ts': 'OM-9.7.5A waiver: legal stage template migration pending',
  'src/services/legal/lgTemplateService.ts': 'OM-9.7.5A waiver: legal template service is admin CRUD',
  'src/services/ssb-configuration/platformReadinessService.ts': 'OM-9.7.5A waiver: readiness self-check',
};

const ALLOW_MIGRATION_COMPATIBILITY = [
  'scripts/',
  'supabase/migrations/',
  'supabase/functions/',
  'src/__tests__/',
  'src/test/',
];

type Classification =
  | 'ALLOWED_CANONICAL_RESOLVER'
  | 'ALLOWED_ADMIN_CONFIG'
  | 'ALLOWED_GOVERNANCE'
  | 'ALLOWED_HEALTH_SCAN'
  | 'ALLOWED_MIGRATION_COMPATIBILITY'
  | 'RUNTIME_BYPASS_WARNING'
  | 'RUNTIME_BYPASS_BLOCKER';

function classify(rel: string): Classification | null {
  if (ALLOW_HEALTH_SCAN.some((p) => rel === p)) return 'ALLOWED_HEALTH_SCAN';
  if (ALLOW_CANONICAL_RESOLVER.some((p) => rel === p || rel.startsWith(p))) return 'ALLOWED_CANONICAL_RESOLVER';
  if (ALLOW_ADMIN_CONFIG.some((p) => rel.startsWith(p))) return 'ALLOWED_ADMIN_CONFIG';
  if (ALLOW_GOVERNANCE.some((p) => rel.startsWith(p))) return 'ALLOWED_GOVERNANCE';
  if (ALLOW_MIGRATION_COMPATIBILITY.some((p) => rel.startsWith(p))) return 'ALLOWED_MIGRATION_COMPATIBILITY';
  return null;
}

// ── Scan targets ────────────────────────────────────────────────────────────
const COMM_TABLES = [
  'comm_media_asset',
  'comm_letterhead',
  'core_template',
  'core_template_version',
  'core_template_layout',
  'notification_templates',
  'comm_email_signature',
  'comm_disclaimer',
  'comm_print_footer',
  'core_text_block',
  'comm_asset_assignment',
  'comm_asset_mapping',
  'comm_asset_category_master',
];

const SOFT_KEYS = ['asset_code', 'letterhead_id', 'template_code', 'approval_status'];

interface Finding {
  file: string;
  line: number;
  matched: string;
  kind: 'TABLE' | 'KEY';
  classification: Classification;
  snippet: string;
  suggested_fix: string;
  waiver_reason?: string;
}

const SUGGESTED_FIX = 'Use resolveBusinessCommunicationContext() (src/lib/comm/businessCommunicationResolver.ts) or the enterprise wrappers in src/lib/enterprise/* instead of direct table access.';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function scan(file: string): Finding[] {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const allowed = classify(rel);
  const waiver = KNOWN_WAIVERS[rel];
  const found: Finding[] = [];

  for (const table of COMM_TABLES) {
    const re = new RegExp(`\\.from\\(\\s*['"\`]${table}['"\`]\\s*\\)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const line = src.slice(0, m.index).split('\n').length;
      const classification: Classification = allowed
        ?? (waiver ? 'RUNTIME_BYPASS_WARNING' : 'RUNTIME_BYPASS_BLOCKER');
      found.push({
        file: rel, line, matched: table, kind: 'TABLE',
        classification,
        snippet: lines[line - 1]?.trim().slice(0, 200) ?? '',
        suggested_fix: SUGGESTED_FIX,
        ...(waiver ? { waiver_reason: waiver } : {}),
      });
    }
  }

  // Soft-key scan: only flag when NOT allow-listed (business module directly
  // referencing template_code / letterhead_id / approval_status / asset_code
  // in query builders is a smell — warn only, do not block).
  if (!allowed) {
    for (const key of SOFT_KEYS) {
      const re = new RegExp(`(?:\\.eq\\(|\\.select\\(|\\.match\\(|\\.filter\\(|\\.in\\()[^\\n]*['"\`]${key}['"\`]`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const line = src.slice(0, m.index).split('\n').length;
        found.push({
          file: rel, line, matched: key, kind: 'KEY',
          classification: 'RUNTIME_BYPASS_WARNING',
          snippet: lines[line - 1]?.trim().slice(0, 200) ?? '',
          suggested_fix: SUGGESTED_FIX,
        });
      }
    }
  }

  return found;
}

// ── Run ─────────────────────────────────────────────────────────────────────
const files = walk(SRC);
const findings = files.flatMap(scan);

const buckets: Record<Classification, Finding[]> = {
  ALLOWED_CANONICAL_RESOLVER: [],
  ALLOWED_ADMIN_CONFIG: [],
  ALLOWED_GOVERNANCE: [],
  ALLOWED_HEALTH_SCAN: [],
  ALLOWED_MIGRATION_COMPATIBILITY: [],
  RUNTIME_BYPASS_WARNING: [],
  RUNTIME_BYPASS_BLOCKER: [],
};
for (const f of findings) buckets[f.classification].push(f);

const report = {
  generated_at: new Date().toISOString(),
  scanned_files: files.length,
  totals: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
  findings,
};

const outPath = join(ROOT, 'docs/enterprise/comm-direct-read-report.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`\nCommunication Direct-Read Governance Report`);
console.log(`──────────────────────────────────────────`);
console.log(`Scanned files: ${files.length}`);
for (const [k, v] of Object.entries(buckets)) {
  console.log(`  ${k.padEnd(35)} ${v.length}`);
}

const blockers = buckets.RUNTIME_BYPASS_BLOCKER;
const warnings = buckets.RUNTIME_BYPASS_WARNING;

if (warnings.length) {
  console.log(`\n⚠ Warnings (${warnings.length}):`);
  for (const w of warnings.slice(0, 25)) {
    console.log(`  ${w.file}:${w.line} [${w.matched}] ${w.snippet}`);
  }
  if (warnings.length > 25) console.log(`  … +${warnings.length - 25} more (see ${relative(ROOT, outPath)})`);
}

if (blockers.length) {
  console.error(`\n✖ Runtime bypass blockers (${blockers.length}):`);
  for (const b of blockers) {
    console.error(`  ${b.file}:${b.line} [${b.matched}] ${b.snippet}`);
    console.error(`    → ${b.suggested_fix}`);
  }
  console.error(`\nReport written to ${relative(ROOT, outPath)}`);
  process.exit(1);
}

console.log(`\n✓ No runtime business-module bypasses detected.`);
console.log(`  Report: ${relative(ROOT, outPath)}`);
