export interface FilingConfigPeriod {
  id: string;
  date_from: string;
  date_to: string | null;
  week_start_day: number;
  filing_window_unit: number;
  filing_window_value: number;
  penalty_initial_threshold: number;
  penalty_subsequent_threshold: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface FilingConfigPeriodFormData {
  date_from: string;
  date_to: string | null;
  week_start_day: number;
  filing_window_unit: number;
  filing_window_value: number;
  penalty_initial_threshold: number;
  penalty_subsequent_threshold: number;
}

export interface FilingConfigAnalysis {
  action: 'normal' | 'split' | 'error';
  message?: string;
  old_record_id?: string;
  old_record_original_from?: string;
  old_record_original_to?: string;
  old_record_new_end?: string;
  new_record_start?: string;
  new_record_end?: string;
  original_values?: {
    week_start_day: number;
    filing_window_unit: number;
    filing_window_value: number;
    penalty_initial_threshold: number;
    penalty_subsequent_threshold: number;
  };
  new_values?: {
    week_start_day: number;
    filing_window_unit: number;
    filing_window_value: number;
    penalty_initial_threshold: number;
    penalty_subsequent_threshold: number;
  };
}
