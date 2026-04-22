export interface TestEnvironment {
  id: string;
  env_key: string;
  label: string;
  description: string | null;
  base_url: string;
  edge_functions_url: string;
  color_hex: string;
  default_api_key_id: string | null;
  destructive_allowed: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface SavedTestCase {
  id: string;
  name: string;
  description: string | null;
  category: string;
  http_method: string;
  endpoint_path: string;
  requires_auth: boolean;
  requires_api_key: boolean;
  default_headers: Record<string, string> | null;
  default_query_params: Record<string, string> | null;
  default_body: any;
  expected_status: number | null;
  expected_response_shape: any;
  tags: string[] | null;
  is_destructive: boolean;
  is_active: boolean;
}

export interface TestExecution {
  id: string;
  saved_case_id: string | null;
  environment_id: string | null;
  api_key_id: string | null;
  test_name: string | null;
  http_method: string;
  full_url: string;
  request_headers: any;
  request_body: any;
  response_status: number | null;
  response_headers: any;
  response_body: any;
  duration_ms: number | null;
  result: 'pending' | 'pass' | 'fail' | 'warning' | 'error';
  failure_reason: string | null;
  expected_status: number | null;
  notes: string | null;
  executed_at: string;
}

export interface ApiKey {
  id: string;
  app_name: string;
  key_prefix: string;
  status: string;
  rate_limit_per_minute: number;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface RunRequestArgs {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  expectedStatus?: number;
  testName?: string;
  savedCaseId?: string | null;
  environmentId?: string | null;
  apiKeyId?: string | null;
}

export interface RunResult {
  status: number | null;
  durationMs: number;
  responseHeaders: Record<string, string>;
  responseBody: any;
  result: 'pass' | 'fail' | 'error';
  failureReason: string | null;
  executionId: string | null;
}
