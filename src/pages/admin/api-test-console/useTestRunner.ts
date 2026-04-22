import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RunRequestArgs, RunResult } from './types';

/**
 * Executes an HTTP request against a target URL with provided headers/body,
 * captures timing + response, classifies pass/fail vs expectedStatus, and
 * persists the result into api_test_executions.
 */
export function useTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);

  async function run(args: RunRequestArgs): Promise<RunResult> {
    setIsRunning(true);
    const started = performance.now();
    let status: number | null = null;
    let responseBody: any = null;
    const responseHeaders: Record<string, string> = {};
    let failureReason: string | null = null;
    let result: 'pass' | 'fail' | 'error' = 'error';

    try {
      const init: RequestInit = {
        method: args.method,
        headers: args.headers,
      };
      if (args.body !== undefined && args.body !== null && args.method !== 'GET' && args.method !== 'HEAD') {
        init.body = typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
      }
      const res = await fetch(args.url, init);
      status = res.status;
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });
      const text = await res.text();
      try { responseBody = JSON.parse(text); } catch { responseBody = text; }

      if (args.expectedStatus !== undefined) {
        if (status === args.expectedStatus) {
          result = 'pass';
        } else {
          result = 'fail';
          failureReason = `Expected status ${args.expectedStatus}, got ${status}`;
        }
      } else {
        result = status >= 200 && status < 400 ? 'pass' : 'fail';
        if (result === 'fail') failureReason = `HTTP ${status}`;
      }
    } catch (e: any) {
      result = 'error';
      failureReason = e?.message || 'Network error';
    }

    const durationMs = Math.round(performance.now() - started);

    // Mask sensitive headers before persisting
    const safeReqHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(args.headers)) {
      const lower = k.toLowerCase();
      if (lower === 'authorization' || lower === 'x-api-key' || lower === 'apikey') {
        safeReqHeaders[k] = v.length > 12 ? `${v.slice(0, 8)}…${v.slice(-4)}` : '••••';
      } else {
        safeReqHeaders[k] = v;
      }
    }

    let executionId: string | null = null;
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: ins } = await supabase
        .from('api_test_executions')
        .insert({
          saved_case_id: args.savedCaseId ?? null,
          environment_id: args.environmentId ?? null,
          api_key_id: args.apiKeyId ?? null,
          test_name: args.testName ?? null,
          http_method: args.method,
          full_url: args.url,
          request_headers: safeReqHeaders,
          request_body: args.body ?? null,
          response_status: status,
          response_headers: responseHeaders,
          response_body: responseBody,
          duration_ms: durationMs,
          result,
          failure_reason: failureReason,
          expected_status: args.expectedStatus ?? null,
          executed_by: u?.user?.id ?? null,
        })
        .select('id')
        .single();
      executionId = ins?.id ?? null;
    } catch (e) {
      // logging is best-effort
      console.warn('Failed to log execution', e);
    }

    const final: RunResult = { status, durationMs, responseHeaders, responseBody, result, failureReason, executionId };
    setLastResult(final);
    setIsRunning(false);
    return final;
  }

  return { run, isRunning, lastResult };
}
