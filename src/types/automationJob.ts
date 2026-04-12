export interface AutomationJob {
  id: string;
  job_code: string;
  name: string;
  description: string | null;
  job_type: string;
  schedule_cron: string | null;
  frequency: string | null;
  is_enabled: boolean | null;
  last_run_at: string | null;
  last_run_status: string | null;
  next_scheduled_at: string | null;
  parameters: Record<string, any> | null;
}

export interface JobRun {
  id: string;
  job_id: string;
  run_status: string;
  is_dry_run: boolean;
  triggered_by: string | null;
  records_processed: number | null;
  records_affected: number | null;
  errors_count: number | null;
  error_details: any;
  summary: any;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}
