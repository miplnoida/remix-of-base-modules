// Other Payments types for C3 employee income-code-based payments

export interface OtherPaymentRow {
  id?: string;
  income_code_id: string;
  income_code?: string;       // display: code from tb_income_codes
  income_description?: string; // display: description from tb_income_codes
  amount: number;
  // Calculated contributions based on income code policy + C3 config rates
  employee_ss: number;
  employee_levy: number;
  employer_ss: number;
  employer_eib: number;
  employer_levy: number;
  employer_severance: number;
  // Policy reference
  policy_id?: string;
  policy_type?: string;
  date_entry_mode?: string;
  // Validation
  policy_error?: string;
}

export interface OtherPaymentTotals {
  totalAmount: number;
  totalEmployeeSS: number;
  totalEmployeeLevy: number;
  totalEmployerSS: number;
  totalEmployerEIB: number;
  totalEmployerLevy: number;
  totalEmployerSeverance: number;
}

export function calculateOtherPaymentTotals(payments: OtherPaymentRow[]): OtherPaymentTotals {
  return payments.reduce(
    (acc, p) => ({
      totalAmount: acc.totalAmount + (p.amount || 0),
      totalEmployeeSS: acc.totalEmployeeSS + (p.employee_ss || 0),
      totalEmployeeLevy: acc.totalEmployeeLevy + (p.employee_levy || 0),
      totalEmployerSS: acc.totalEmployerSS + (p.employer_ss || 0),
      totalEmployerEIB: acc.totalEmployerEIB + (p.employer_eib || 0),
      totalEmployerLevy: acc.totalEmployerLevy + (p.employer_levy || 0),
      totalEmployerSeverance: acc.totalEmployerSeverance + (p.employer_severance || 0),
    }),
    {
      totalAmount: 0,
      totalEmployeeSS: 0,
      totalEmployeeLevy: 0,
      totalEmployerSS: 0,
      totalEmployerEIB: 0,
      totalEmployerLevy: 0,
      totalEmployerSeverance: 0,
    }
  );
}

export const EMPTY_OTHER_PAYMENT: OtherPaymentRow = {
  income_code_id: '',
  amount: 0,
  employee_ss: 0,
  employee_levy: 0,
  employer_ss: 0,
  employer_eib: 0,
  employer_levy: 0,
  employer_severance: 0,
};
