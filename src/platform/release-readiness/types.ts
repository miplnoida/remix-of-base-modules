export type CheckStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'ATTESTED' | 'UNKNOWN';

export interface CheckResult {
  check_code: string;
  check_name: string;
  category: string;
  status: CheckStatus;
  summary: string;
  details?: Array<{ label: string; value: string | number }>;
  issues?: string[];
  ran_at: string;
}

export interface ReleaseReadinessRun {
  id: string;
  release_tag: string;
  overall_status: CheckStatus;
  passed_count: number;
  warning_count: number;
  failed_count: number;
  check_results: CheckResult[];
  notes: string | null;
  run_by: string | null;
  run_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReleaseReadinessAttestation {
  id: string;
  release_tag: string;
  check_code: string;
  attested_status: CheckStatus;
  evidence_url: string | null;
  notes: string | null;
  attested_by: string | null;
  attested_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttestationInput {
  release_tag: string;
  check_code: string;
  attested_status?: CheckStatus;
  evidence_url?: string;
  notes?: string;
}
