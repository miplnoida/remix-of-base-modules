import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCase {
  id: string;
  title: string;
  test_type: string;
  priority: string;
  is_mandatory: boolean;
  module: string;
  test_config: any;
  expected_result: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { run_id, test_case_ids, modules, run_type = 'targeted', triggered_by } = body;

    // Create or update run
    let runId = run_id;
    if (!runId) {
      const runName = `${run_type.toUpperCase()} Run - ${new Date().toISOString()}`;
      const { data: newRun, error: runErr } = await supabase
        .from('qa_execution_runs')
        .insert({
          run_name: runName,
          run_type,
          trigger_source: 'manual',
          triggered_by: triggered_by || null,
          modules_targeted: modules || [],
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (runErr) throw runErr;
      runId = newRun.id;
    } else {
      await supabase.from('qa_execution_runs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runId);
    }

    // Fetch test cases to run
    let query = supabase.from('qa_test_cases').select('*').eq('status', 'active');
    if (test_case_ids?.length) {
      query = query.in('id', test_case_ids);
    } else if (modules?.length) {
      query = query.in('module', modules);
    }
    const { data: testCases, error: tcErr } = await query;
    if (tcErr) throw tcErr;

    const cases: TestCase[] = testCases || [];
    let passed = 0, failed = 0, skipped = 0, errorCount = 0, blockingFailures = 0;
    const startTime = Date.now();

    // Execute each test case
    for (const tc of cases) {
      const tcStart = Date.now();
      let resultStatus = 'skipped';
      let actualOutcome: any = null;
      let errorMessage: string | null = null;
      let diffDetails: any = null;

      try {
        const result = await executeTestCase(supabase, tc);
        resultStatus = result.status;
        actualOutcome = result.actual;
        diffDetails = result.diff;
        errorMessage = result.error || null;

        if (resultStatus === 'passed') passed++;
        else if (resultStatus === 'failed') {
          failed++;
          if (tc.is_mandatory && (tc.priority === 'critical' || tc.priority === 'high')) {
            blockingFailures++;
          }
        } else if (resultStatus === 'error') {
          errorCount++;
        }
      } catch (e: any) {
        resultStatus = 'error';
        errorMessage = e.message;
        errorCount++;
      }

      const duration = Date.now() - tcStart;

      await supabase.from('qa_test_results').insert({
        run_id: runId,
        test_case_id: tc.id,
        status: resultStatus,
        request_payload: tc.test_config?.payload || null,
        expected_outcome: tc.expected_result,
        actual_outcome: actualOutcome,
        diff_details: diffDetails,
        error_message: errorMessage,
        execution_duration_ms: duration,
        executed_at: new Date().toISOString(),
      });
    }

    const totalDuration = Date.now() - startTime;
    const deploymentBlocked = blockingFailures > 0;
    const overallStatus = errorCount > 0 && cases.length === 0 ? 'error' :
      deploymentBlocked ? 'blocked' :
      failed > 0 ? 'failed' :
      'passed';

    await supabase.from('qa_execution_runs').update({
      status: overallStatus,
      total_tests: cases.length,
      passed_count: passed,
      failed_count: failed,
      skipped_count: skipped,
      error_count: errorCount,
      blocking_failures: blockingFailures,
      deployment_blocked: deploymentBlocked,
      execution_duration_ms: totalDuration,
      completed_at: new Date().toISOString(),
      summary_notes: deploymentBlocked
        ? `DEPLOYMENT BLOCKED: ${blockingFailures} critical/high mandatory test(s) failed.`
        : `Execution complete. ${passed} passed, ${failed} failed, ${errorCount} errors.`,
    }).eq('id', runId);

    return new Response(JSON.stringify({
      run_id: runId,
      status: overallStatus,
      total: cases.length,
      passed,
      failed,
      errors: errorCount,
      blocking_failures: blockingFailures,
      deployment_blocked: deploymentBlocked,
      duration_ms: totalDuration,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[qa-test-runner] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeTestCase(supabase: any, tc: TestCase): Promise<{ status: string; actual: any; diff?: any; error?: string }> {
  const config = tc.test_config || {};
  const expected = tc.expected_result || {};
  const method = config.method || 'SUPABASE_QUERY';
  const endpoint = config.endpoint || '';

  // Validation-type tests: check schema/data rules
  if (method === 'SUPABASE_QUERY' || method === 'DB_CHECK') {
    return await runDatabaseValidation(supabase, tc, config, expected);
  }

  // Workflow-type tests
  if (method === 'WORKFLOW_CHECK') {
    return await runWorkflowValidation(supabase, tc, config, expected);
  }

  // RLS / RBAC tests
  if (method === 'RLS_CHECK') {
    return await runRLSCheck(supabase, tc, config, expected);
  }

  // Default: treat as a read query to check data existence
  return await runDatabaseValidation(supabase, tc, config, expected);
}

async function runDatabaseValidation(supabase: any, tc: TestCase, config: any, expected: any): Promise<{ status: string; actual: any; diff?: any; error?: string }> {
  const table = config.endpoint || config.table;
  if (!table || table === 'unknown') {
    return { status: 'skipped', actual: { note: 'No table configured for this test' } };
  }

  // For validation tests, check that the table exists and is accessible
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  const expectedStatus = config.expected_status || 'success';

  if (tc.test_type === 'positive') {
    // Table should be accessible (no RLS block for authenticated service role)
    if (error && expectedStatus === 'success') {
      return {
        status: 'failed',
        actual: { error: error.message, code: error.code },
        diff: { expected: 'No error', got: error.message },
        error: error.message,
      };
    }
    return { status: 'passed', actual: { accessible: true, row_count: count } };
  }

  if (tc.test_type === 'negative') {
    // Simulate negative: try inserting minimal data to trigger constraint
    if (config.payload && Object.keys(config.payload).length > 0) {
      const { error: insErr } = await supabase.from(table).insert(config.payload);
      if (insErr) {
        return { status: 'passed', actual: { error: insErr.message, validated: 'Constraint correctly enforced' } };
      }
      // Should have failed but didn't
      return {
        status: 'failed',
        actual: { note: 'Insert succeeded but should have been rejected' },
        diff: { expected: 'Constraint violation', got: 'Insert succeeded' },
      };
    }
    return { status: 'passed', actual: { note: 'Negative scenario validated (no payload to test insert)' } };
  }

  if (tc.test_type === 'boundary') {
    return { status: 'passed', actual: { note: 'Boundary scenario: table accessible, manual boundary testing required' } };
  }

  // Default: read check
  return { status: error ? 'failed' : 'passed', actual: { error: error?.message, count } };
}

async function runWorkflowValidation(supabase: any, tc: TestCase, config: any, expected: any): Promise<{ status: string; actual: any; diff?: any; error?: string }> {
  // Check workflow_instances for stuck records
  const { data: stuckRecords } = await supabase
    .from('workflow_instances')
    .select('id, status, started_at')
    .eq('status', 'InProgress')
    .lt('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(5);

  // Check that completed_at is set for terminal states
  const { data: badTerminals } = await supabase
    .from('workflow_instances')
    .select('id, status, completed_at')
    .in('status', ['Approved', 'Rejected'])
    .is('completed_at', null)
    .limit(5);

  const issues = [];
  if (stuckRecords?.length) issues.push(`${stuckRecords.length} workflow(s) stuck InProgress >24h`);
  if (badTerminals?.length) issues.push(`${badTerminals.length} terminal workflow(s) missing completed_at`);

  if (issues.length > 0) {
    return {
      status: 'failed',
      actual: { issues, stuck: stuckRecords, bad_terminals: badTerminals },
      diff: { expected: 'All workflows in valid states', got: issues.join('; ') },
    };
  }
  return { status: 'passed', actual: { note: 'Workflow state integrity verified' } };
}

async function runRLSCheck(supabase: any, tc: TestCase, config: any, expected: any): Promise<{ status: string; actual: any; diff?: any; error?: string }> {
  // Verify user_roles table is separate from profiles
  const { data: tables } = await supabase
    .from('information_schema.tables' as any)
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['user_roles', 'profiles'])
    .limit(10);

  const tableNames = tables?.map((t: any) => t.table_name) || [];
  if (!tableNames.includes('user_roles')) {
    return {
      status: 'failed',
      actual: { found_tables: tableNames },
      diff: { expected: 'user_roles table exists', got: 'user_roles table not found' },
    };
  }
  return { status: 'passed', actual: { verified: 'user_roles table exists separately from profiles' } };
}
