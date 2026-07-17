/**
 * BN-AWARD360-B3-C2 — Migration-contract test.
 *
 * Reads the repair migration SQL file text and asserts the deterministic
 * conflict clause, idempotent shape, absence of RLS/DDL changes, explicit
 * failure when the module row is missing, and scoping of grants.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_FILE = path.resolve(
  __dirname,
  '../../../../supabase/migrations/20260717110411_1212d110-3b29-4add-a58b-fcf1cc0eb6a1.sql',
);

describe('BN-AWARD360-B3-C2 · migration contract', () => {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

  it('exists on disk', () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it('targets only the canonical bn_awards_list module', () => {
    expect(sql).toMatch(/name\s*=\s*'bn_awards_list'/);
    // No cross-module fallback / wildcards.
    expect(sql).not.toMatch(/action_name\s*=\s*'view'\s+AND\s+module_id\s*<>/i);
  });

  it('raises an explicit error when the module is absent', () => {
    expect(sql).toMatch(/RAISE\s+EXCEPTION[^;]*bn_awards_list is missing/i);
  });

  it('upserts the view action idempotently with is_enabled=true', () => {
    expect(sql).toMatch(/INSERT INTO public\.module_actions[\s\S]*'view'[\s\S]*'View'[\s\S]*true/);
    expect(sql).toMatch(/ON CONFLICT\s*\(module_id,\s*action_name\)\s*DO UPDATE/i);
    expect(sql).toMatch(/is_enabled\s*=\s*true/);
  });

  it('uses DO UPDATE SET is_granted=true for role-permission upserts', () => {
    expect(sql).toMatch(/ON CONFLICT\s*\(role_id,\s*module_id,\s*action_id\)\s*DO UPDATE SET is_granted\s*=\s*true/i);
  });

  it('scopes role grants to roles already holding create/edit/delete plus Admin', () => {
    expect(sql).toMatch(/ma\.action_name IN \('create',\s*'edit',\s*'delete'\)/i);
    expect(sql).toMatch(/role_name\s*=\s*'Admin'/);
    // Nothing that broad-grants to authenticated/anon/public.
    expect(sql).not.toMatch(/TO\s+authenticated\b/i);
    expect(sql).not.toMatch(/TO\s+anon\b/i);
    expect(sql).not.toMatch(/TO\s+public\b/i);
  });

  it('does not modify unrelated module actions', () => {
    // Only inserts/updates on module_actions target bn_awards_list.view; no
    // DELETE, no UPDATE without ON CONFLICT scoping.
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.module_actions/i);
    expect(sql).not.toMatch(/UPDATE\s+public\.module_actions\s+SET/i);
  });

  it('performs no RLS changes and no destructive DDL', () => {
    expect(sql).not.toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).not.toMatch(/CREATE\s+POLICY/i);
    expect(sql).not.toMatch(/DROP\s+POLICY/i);
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE[^\n]*ADD\s+COLUMN/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
  });

  it('is idempotent (re-runnable) — no plain INSERTs without ON CONFLICT', () => {
    // Every INSERT INTO ... in this migration must be followed by ON CONFLICT.
    const inserts = sql.match(/INSERT INTO[\s\S]*?;/g) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const stmt of inserts) {
      expect(stmt).toMatch(/ON CONFLICT/i);
    }
  });
});
