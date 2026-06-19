#!/usr/bin/env bun
/**
 * CLI: run formula governance chain resolution and print results.
 * Exit code 1 if any UNKNOWN / MISSING_* found.
 *
 * Usage:  bun scripts/bn/run-formula-resolution.ts
 */
import { runResolution } from '../../src/services/bn/governance/formulaResolverService';

(async () => {
  const r = await runResolution();
  console.log(`run_id=${r.runId} total=${r.total} unresolved=${r.unresolved}`);
  if (r.unresolved > 0) process.exit(1);
})();
