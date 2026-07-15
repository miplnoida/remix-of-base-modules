/**
 * BN-AWARD360-2.1H — Survivors migration guardrails (static analysis).
 * The migration must:
 *  - Only register bn_survivors.view (no mutation actions).
 *  - Be idempotent (INSERT ... ON CONFLICT ... / UPDATE guard).
 *  - Preserve rollout: is_enabled=true, routes_enabled=true, actions_enabled=false.
 *  - Grant Survivors view only to roles already holding bn_awards_list.view.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260715211716_a94ff92c-afd9-4688-89e0-0355bf17f4ac.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

describe('BN-AWARD360-2.1H · Survivors migration', () => {
  it('registers only bn_survivors.view — no mutation actions', () => {
    // Only one INSERT into module_actions and its action_name is view.
    const insertMatches = sql.match(/INSERT INTO\s+public\.module_actions[\s\S]+?(?=;)/gi) ?? [];
    expect(insertMatches).toHaveLength(1);
    expect(insertMatches[0]).toMatch(/'view'/);
    for (const forbidden of ['add', 'amend', 'end', 'approve', 'delete', 'edit', 'create']) {
      expect(insertMatches[0]).not.toMatch(new RegExp(`'${forbidden}'`));
    }
  });

  it('is idempotent (ON CONFLICT for both action and grants)', () => {
    expect(sql).toMatch(/ON CONFLICT \(module_id, action_name\) DO UPDATE/);
    expect(sql).toMatch(/ON CONFLICT \(role_id, module_id, action_id\) DO NOTHING/);
  });

  it('preserves rollout: is_enabled=true, routes_enabled=true, actions_enabled=false', () => {
    expect(sql).toMatch(/is_enabled\s*=\s*true/);
    expect(sql).toMatch(/routes_enabled\s*=\s*true/);
    expect(sql).toMatch(/actions_enabled\s*=\s*false/);
  });

  it('grants Survivors view only to roles that already have bn_awards_list.view', () => {
    expect(sql).toMatch(/bn_awards_list/);
    expect(sql).toMatch(/action_name = 'view'/);
    expect(sql).toMatch(/is_granted = true/);
  });
});
