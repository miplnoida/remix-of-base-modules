#!/usr/bin/env bun
/**
 * CLI: run product calculation validation and print results.
 * Exit code 1 if any INVALID product versions found.
 *
 * Usage:  bun scripts/bn/run-product-validation.ts
 */
import { runProductValidation } from '../../src/services/bn/governance/productCalcValidationService';

(async () => {
  const r = await runProductValidation();
  console.log(`run_id=${r.runId} valid=${r.valid} invalid=${r.invalid}`);
  if (r.invalid > 0) process.exit(1);
})();
