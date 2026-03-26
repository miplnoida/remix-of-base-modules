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
