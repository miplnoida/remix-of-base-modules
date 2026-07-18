/**
 * AW360-WAVE-1-C1 Slice B.1a §12 + §13 — router-derived route validation
 * and exact query-matrix drift.
 *
 * §12: The checked-in `docs/bn/award360-query-matrix.md` must equal the
 * pure renderer output verbatim (including provenance metadata line).
 *
 * §13: Route templates on Award action definitions must resolve into a
 * route pattern that actually exists in `src/components/routing/AppRoutes.tsx`.
 * An invented route (e.g. `/bn/totally-invented`) must fail this test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderAward360QueryMatrixMarkdown,
} from '@/services/bn/awards/award360SchemaContract';
import { AWARD360_CERTIFIED_LOADERS_BY_TABLE } from '@/services/bn/awards/award360LoaderEvidence';
import { AWARD_ACTION_DEFINITIONS } from '@/services/bn/awards/awardActionCatalog';

// ─── §13 · router-derived route parser ────────────────────────────────────
function extractRoutePatterns(): string[] {
  const raw = readFileSync(
    resolve(process.cwd(), 'src/components/routing/AppRoutes.tsx'),
    'utf8',
  );
  const patterns = new Set<string>();
  for (const m of raw.matchAll(/path="(\/[^"]+)"/g)) patterns.add(m[1]);
  return [...patterns];
}

/**
 * Convert `/bn/awards/:id` and `/bn/claims/c-1` alike into a comparable
 * shape by treating each dynamic segment as a wildcard. Then check
 * whether the action route matches any registered pattern.
 */
function routeMatches(actionRoute: string, patterns: string[]): boolean {
  // Strip query string.
  const path = actionRoute.split('?')[0];
  const actionSegs = path.split('/').filter(Boolean);
  return patterns.some((pat) => {
    const patSegs = pat.split('/').filter(Boolean);
    // The action route may have MORE segments than the pattern only when
    // the pattern ends with a splat (`*`). Match segments 1:1 up to the
    // pattern length; dynamic pattern segments (`:foo`) accept anything.
    if (actionSegs.length < patSegs.length) return false;
    if (actionSegs.length > patSegs.length && !patSegs[patSegs.length - 1]?.startsWith('*'))
      return false;
    for (let i = 0; i < patSegs.length; i++) {
      const ps = patSegs[i];
      if (ps.startsWith(':') || ps.startsWith('*')) continue;
      if (ps !== actionSegs[i]) return false;
    }
    return true;
  });
}

describe('AW360 Slice B.1a · router-derived route validation', () => {
  const patterns = extractRoutePatterns();

  it('parser found a non-trivial set of route patterns', () => {
    expect(patterns.length).toBeGreaterThan(100);
    // Sanity: canonical BN routes present
    expect(patterns).toContain('/bn/awards');
    expect(patterns).toContain('/bn/claims');
  });

  it('every navigation action route resolves against AppRoutes.tsx', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      if (def.isMutation) continue;
      expect(
        routeMatches(def.routeTemplate, patterns),
        `${def.key} → ${def.routeTemplate} does not match any registered route`,
      ).toBe(true);
    }
  });

  // AW360 Sub-batch B2-a §14 — mutation targets deep-link into specialist
  // workspaces; even though Wave 1 disables mutations, the navigation
  // target must still resolve so the "open specialist workspace" hint in
  // the UI never dead-ends.
  it('every mutation action route resolves against AppRoutes.tsx', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      if (!def.isMutation) continue;
      expect(
        routeMatches(def.routeTemplate, patterns),
        `${def.key} (mutation) → ${def.routeTemplate} does not match any registered route`,
      ).toBe(true);
    }
  });

  it('fallback route templates (e.g. OPEN_CLAIM worklist) resolve', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      if (!def.fallbackRouteTemplate) continue;
      expect(
        routeMatches(def.fallbackRouteTemplate, patterns),
        `${def.key} fallback → ${def.fallbackRouteTemplate} does not match any registered route`,
      ).toBe(true);
    }
  });

  it('an invented route fails the resolver', () => {
    expect(routeMatches('/bn/totally-invented', patterns)).toBe(false);
    expect(routeMatches('/bn/awards/fake/sub-route/deeper', patterns)).toBe(false);
  });

  it('parameterised routes match with concrete values', () => {
    // /bn/awards/:id  ←→  /bn/awards/a-123
    expect(routeMatches('/bn/awards/a-123', patterns)).toBe(true);
    // /bn/claims/:id/eligibility
    expect(routeMatches('/bn/claims/c-1/eligibility', patterns)).toBe(true);
    // Query strings on action templates are stripped before matching.
    expect(routeMatches('/bn/survivors?awardId=a-1', patterns)).toBe(true);
  });
});

// ─── §12 · exact query-matrix drift ──────────────────────────────────────
describe('AW360 Slice B.1a · exact query-matrix drift', () => {
  it('checked-in matrix equals the pure renderer output verbatim (incl. provenance metadata)', () => {
    const rawJson = readFileSync(
      resolve(process.cwd(), 'src/services/bn/awards/award360.live-schema.json'),
      'utf8',
    );
    const parsed = JSON.parse(rawJson);
    const meta = parsed.metadata as {
      projectRef: string;
      capturedAt: string;
      source: string;
    };
    const tableCount = Object.keys(parsed.tables).length;
    // Provenance format is fixed by `scripts/generate-award360-query-matrix.ts`.
    const metaLine = `Tables inspected: **${tableCount}** (source: \`${meta.source}\`, projectRef \`${meta.projectRef}\`, capturedAt \`${meta.capturedAt}\`).`;
    const rendered = renderAward360QueryMatrixMarkdown(metaLine);
    const actual = readFileSync(
      resolve(process.cwd(), 'docs/bn/award360-query-matrix.md'),
      'utf8',
    );
    expect(actual.trim()).toBe(rendered.trim());
  });
});
