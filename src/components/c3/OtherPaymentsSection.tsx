/**
 * OtherPaymentsSection - Reusable UI for managing Other Payments per employee.
 * Used in EmployeeModal (Add/Edit popup) and DataEntryGrid.
 */
import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, AlertCircle, Check, FileText } from 'lucide-react';
import { useIncomeCodes } from '@/hooks/useIncomeCodePolicy';
import { useIncomeCodePolicyLookup, useOtherPaymentCalculation, type C3ConfigRates, type PolicyLookupResult } from '@/hooks/useOtherPayments';
import type { OtherPaymentRow } from '@/types/otherPayments';
import { EMPTY_OTHER_PAYMENT, calculateOtherPaymentTotals } from '@/types/otherPayments';

interface OtherPaymentsSectionProps {
  payments: OtherPaymentRow[];
  onChange: (payments: OtherPaymentRow[]) => void;
  periodYear: number;
  periodMonth: number;
  configRates?: C3ConfigRates; // retained for API compatibility
  isReadOnly?: boolean;
  compact?: boolean;
}

const formatCurrency = (v: number) => `$${v.toFixed(2)}`;

export default function OtherPaymentsSection({
  payments,
  onChange,
  periodYear,
  periodMonth,
  configRates,
  isReadOnly = false,
  compact = false,
}: OtherPaymentsSectionProps) {
  const { data: incomeCodes, isLoading: isLoadingCodes } = useIncomeCodes(true);
  const { lookupPolicy } = useIncomeCodePolicyLookup(periodYear, periodMonth);
  const { calculatePayment } = useOtherPaymentCalculation(periodYear, periodMonth);

  // Use a ref to always access the latest payments to avoid stale closures in async callbacks
  const paymentsRef = useRef(payments);
  paymentsRef.current = payments;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const incomeCodesRef = useRef(incomeCodes);
  incomeCodesRef.current = incomeCodes;


  // Store policy results for recalculation
  const policyCacheRef = useRef<Record<string, PolicyLookupResult>>({});

  // Look up policy when income code changes — uses refs to avoid stale closures
  const lookupAndApplyPolicy = useCallback(async (incomeCodeId: string, rowIndex: number) => {
    if (!incomeCodeId) return;

    const result = await lookupPolicy(incomeCodeId);
    policyCacheRef.current[incomeCodeId] = result;

    const currentPayments = paymentsRef.current;
    const currentRow = currentPayments[rowIndex];
    if (!currentRow) return;

    const codeInfo = incomeCodesRef.current?.find(c => c.id === incomeCodeId);

    let backendCalc: any = null;
    if (result.found && currentRow.amount > 0) {
      backendCalc = await calculatePayment(incomeCodeId, currentRow.amount);
    }

    const updated = [...currentPayments];
    updated[rowIndex] = {
      ...currentRow,
      income_code: codeInfo?.code || currentRow.income_code || '',
      income_description: codeInfo?.description || currentRow.income_description || '',
      policy_id: backendCalc?.policy_id || result.policy_id,
      policy_type: backendCalc?.policy_type || result.policy_type,
      date_entry_mode: backendCalc?.date_entry_mode || result.date_entry_mode,
      employee_ss: backendCalc?.employee_ss || 0,
      employee_levy: backendCalc?.employee_levy || 0,
      employer_ss: backendCalc?.employer_ss || 0,
      employer_eib: backendCalc?.employer_eib || 0,
      employer_levy: backendCalc?.employer_levy || 0,
      employer_severance: backendCalc?.employer_severance || 0,
      policy_error: result.found ? undefined : (result.error || 'No active policy for this period'),
    };
    onChangeRef.current(updated);
  }, [lookupPolicy, calculatePayment]);


  const handleAddRow = () => {
    onChange([...payments, { ...EMPTY_OTHER_PAYMENT }]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  const handleCodeChange = (index: number, incomeCodeId: string) => {
    const isDuplicate = payments.some((p, i) => i !== index && p.income_code_id === incomeCodeId);
    if (isDuplicate) {
      const updated = [...payments];
      updated[index] = {
        ...updated[index],
        policy_error: 'This income code is already selected in another row.',
      };
      onChange(updated);
      return;
    }

    const codeInfo = incomeCodes?.find(c => c.id === incomeCodeId);
    const updated = [...payments];
    updated[index] = {
      ...updated[index],
      income_code_id: incomeCodeId,
      income_code: codeInfo?.code || '',
      income_description: codeInfo?.description || '',
      policy_error: undefined,
    };
    onChange(updated);
    lookupAndApplyPolicy(incomeCodeId, index);
  };

  const handleAmountChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    if ((parts[0] || '').length > 8) return;
    if (parts[1] !== undefined && parts[1].length > 2) return;

    const numValue = parseFloat(clean) || 0;
    if (numValue < 0) return;

    const currentPayments = paymentsRef.current;
    const row = currentPayments[index];
    if (!row) return;

    const updated = [...currentPayments];
    updated[index] = {
      ...row,
      amount: numValue,
      _rawAmount: clean,
      policy_error: clean && numValue <= 0 ? 'Amount must be greater than zero.' : row.policy_error,
    } as any;
    onChangeRef.current(updated);

    const codeId = row.income_code_id;
    if (!codeId || numValue <= 0) {
      const resetRows = [...paymentsRef.current];
      if (!resetRows[index]) return;
      resetRows[index] = {
        ...resetRows[index],
        employee_ss: 0,
        employee_levy: 0,
        employer_ss: 0,
        employer_eib: 0,
        employer_levy: 0,
        employer_severance: 0,
      };
      onChangeRef.current(resetRows);
      return;
    }

    calculatePayment(codeId, numValue).then((calc) => {
      const latestRows = paymentsRef.current;
      const latestRow = latestRows[index];
      if (!latestRow || latestRow.income_code_id !== codeId) return;

      const nextRows = [...latestRows];
      nextRows[index] = {
        ...latestRow,
        policy_id: calc.policy_id || latestRow.policy_id,
        policy_type: calc.policy_type || latestRow.policy_type,
        date_entry_mode: calc.date_entry_mode || latestRow.date_entry_mode,
        employee_ss: calc.employee_ss || 0,
        employee_levy: calc.employee_levy || 0,
        employer_ss: calc.employer_ss || 0,
        employer_eib: calc.employer_eib || 0,
        employer_levy: calc.employer_levy || 0,
        employer_severance: calc.employer_severance || 0,
        policy_error: calc.success && calc.found ? undefined : (calc.error || 'Policy calculation failed'),
      };
      onChangeRef.current(nextRows);
    });
  };

  const handleAmountBlur = (index: number) => {
    const currentPayments = paymentsRef.current;
    const row = currentPayments[index];
    if (!row) return;
    // Clean up raw display value on blur
    const updated = [...currentPayments];
    const cleanRow = { ...updated[index] };
    delete (cleanRow as any)._rawAmount;
    updated[index] = cleanRow;
    onChangeRef.current(updated);
  };

  // Get used income codes to prevent duplicates
  const usedCodeIds = payments.map(p => p.income_code_id).filter(Boolean);
  const totals = calculateOtherPaymentTotals(payments.filter(p => p.income_code_id && p.amount > 0));
  const hasErrors = payments.some(p => p.policy_error);

  return (
    <div className={`rounded-lg border border-violet-200 bg-violet-50/30 ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <FileText className="h-3.5 w-3.5 text-violet-600" />
        <h3 className={`font-semibold text-violet-800 uppercase tracking-wide ${compact ? 'text-[10px]' : 'text-xs'}`}>Other Payments</h3>
        {payments.filter(p => p.income_code_id && p.amount > 0).length > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 ml-auto border-violet-300 text-violet-700">
            {payments.filter(p => p.income_code_id && p.amount > 0).length} items · {formatCurrency(totals.totalAmount)}
          </Badge>
        )}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {payments.map((row, idx) => {
          const rawAmount = (row as any)._rawAmount;
          const displayAmount = rawAmount !== undefined ? rawAmount : (row.amount === 0 ? '' : String(row.amount));

          return (
            <div key={idx} className="rounded-md border border-violet-200 bg-background p-2 space-y-1.5">
              <div className="flex items-start gap-2">
                {/* Income Code Selector */}
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-[10px] text-muted-foreground">Income Code</Label>
                  <SearchableSelect
                    value={row.income_code_id || ''}
                    onValueChange={(v) => handleCodeChange(idx, v)}
                    disabled={isReadOnly}
                    options={(incomeCodes || []).map(code => ({
                      value: code.id,
                      label: `${code.code} - ${code.description}`,
                      searchText: `${code.code} ${code.description}`,
                    }))}
                    placeholder={isLoadingCodes ? "Loading..." : "Select code"}
                    searchPlaceholder="Search by code or description..."
                    emptyMessage="No income codes found."
                    className="h-8 text-xs"
                  />
                </div>

                {/* Amount */}
                <div className="w-28">
                  <Label className="text-[10px] text-muted-foreground">Amount</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={displayAmount}
                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                    onBlur={() => handleAmountBlur(idx)}
                    className="h-8 text-xs text-right font-mono"
                    placeholder="0.00"
                    disabled={isReadOnly || !row.income_code_id}
                  />
                  {row.amount < 0 && (
                    <p className="text-[10px] text-destructive mt-0.5">Amount must be positive</p>
                  )}
                </div>

                {/* Remove button */}
                {!isReadOnly && (
                  <div className="pt-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Policy status + contributions */}
              {row.income_code_id && (
                <div className="flex items-center gap-2 flex-wrap">
                  {row.policy_error ? (
                    <div className="flex items-center gap-1 text-[10px] text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      <span>{row.policy_error}</span>
                    </div>
                  ) : row.amount > 0 && row.policy_id ? (
                    <>
                      <div className="flex items-center gap-1 text-[10px] text-violet-700">
                        <Check className="h-3 w-3" />
                        <span>Policy active</span>
                      </div>
                      {(row.employee_ss > 0 || row.employer_ss > 0 || row.employer_levy > 0) && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                          {row.employee_ss > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">EE SS: {formatCurrency(row.employee_ss)}</Badge>}
                          {row.employer_ss > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">ER SS: {formatCurrency(row.employer_ss)}</Badge>}
                          {row.employer_eib > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">EIB: {formatCurrency(row.employer_eib)}</Badge>}
                          {row.employee_levy > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">EE Levy: {formatCurrency(row.employee_levy)}</Badge>}
                          {row.employer_levy > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">ER Levy: {formatCurrency(row.employer_levy)}</Badge>}
                          {row.employer_severance > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">Sev: {formatCurrency(row.employer_severance)}</Badge>}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error summary */}
      {hasErrors && (
        <Alert variant="destructive" className="mt-2 py-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            One or more income codes do not have an active policy for the selected period. Please configure policies before saving.
          </AlertDescription>
        </Alert>
      )}

      {/* Add button */}
      {!isReadOnly && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-7 text-xs gap-1 border-violet-300 text-violet-700 hover:bg-violet-50"
          onClick={handleAddRow}
        >
          <Plus className="h-3 w-3" />
          Add Other Payment
        </Button>
      )}

      {/* Totals row */}
      {payments.filter(p => p.amount > 0).length > 0 && (
        <div className="mt-2 pt-2 border-t border-violet-200 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span className="font-semibold text-violet-800">Totals:</span>
          <span>Amount: <strong>{formatCurrency(totals.totalAmount)}</strong></span>
          {totals.totalEmployeeSS > 0 && <span>EE SS: <strong>{formatCurrency(totals.totalEmployeeSS)}</strong></span>}
          {totals.totalEmployerSS > 0 && <span>ER SS: <strong>{formatCurrency(totals.totalEmployerSS)}</strong></span>}
          {totals.totalEmployerEIB > 0 && <span>EIB: <strong>{formatCurrency(totals.totalEmployerEIB)}</strong></span>}
          {totals.totalEmployeeLevy > 0 && <span>EE Levy: <strong>{formatCurrency(totals.totalEmployeeLevy)}</strong></span>}
          {totals.totalEmployerLevy > 0 && <span>ER Levy: <strong>{formatCurrency(totals.totalEmployerLevy)}</strong></span>}
          {totals.totalEmployerSeverance > 0 && <span>Sev: <strong>{formatCurrency(totals.totalEmployerSeverance)}</strong></span>}
        </div>
      )}
    </div>
  );
}
