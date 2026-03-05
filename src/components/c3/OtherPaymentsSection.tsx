/**
 * OtherPaymentsSection - Reusable UI for managing Other Payments per employee.
 * Used in EmployeeModal (Add/Edit popup) and DataEntryGrid.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, AlertCircle, Check, Loader2, FileText } from 'lucide-react';
import { useIncomeCodes } from '@/hooks/useIncomeCodePolicy';
import { useIncomeCodePolicyLookup, calculateOtherPaymentContributions, type C3ConfigRates, type PolicyLookupResult } from '@/hooks/useOtherPayments';
import type { OtherPaymentRow } from '@/types/otherPayments';
import { EMPTY_OTHER_PAYMENT, calculateOtherPaymentTotals } from '@/types/otherPayments';

interface OtherPaymentsSectionProps {
  payments: OtherPaymentRow[];
  onChange: (payments: OtherPaymentRow[]) => void;
  periodYear: number;
  periodMonth: number;
  configRates?: C3ConfigRates;
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
  const [policyCache, setPolicyCache] = useState<Record<string, PolicyLookupResult>>({});

  // Default rates if config not provided
  const rates: C3ConfigRates = configRates || {
    employeeSSRate: 0.05,
    employerSSRate: 0.05,
    employerEIBRate: 0.01,
    employerLevyRate: 0.03,
    employerSeveranceRate: 0.01,
  };

  // Look up policy when income code changes
  const lookupAndApplyPolicy = useCallback(async (incomeCodeId: string, rowIndex: number) => {
    if (!incomeCodeId) return;

    const result = await lookupPolicy(incomeCodeId);
    setPolicyCache(prev => ({ ...prev, [incomeCodeId]: result }));

    const currentRow = payments[rowIndex];
    if (!currentRow) return;

    const contribs = calculateOtherPaymentContributions(currentRow.amount, result, rates);
    const codeInfo = incomeCodes?.find(c => c.id === incomeCodeId);

    const updated = [...payments];
    updated[rowIndex] = {
      ...currentRow,
      ...contribs,
      income_code: codeInfo?.code || '',
      income_description: codeInfo?.description || '',
      policy_error: result.found ? undefined : (result.error || 'No active policy for this period'),
    };
    onChange(updated);
  }, [payments, onChange, lookupPolicy, rates, incomeCodes]);

  // Recalculate when amount changes
  const recalculateRow = useCallback((rowIndex: number, amount: number) => {
    const row = payments[rowIndex];
    if (!row?.income_code_id) return;

    const policy = policyCache[row.income_code_id];
    if (!policy?.found) return;

    const contribs = calculateOtherPaymentContributions(amount, policy, rates);
    const updated = [...payments];
    updated[rowIndex] = { ...row, amount, ...contribs };
    onChange(updated);
  }, [payments, onChange, policyCache, rates]);

  const handleAddRow = () => {
    onChange([...payments, { ...EMPTY_OTHER_PAYMENT }]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  const handleCodeChange = (index: number, incomeCodeId: string) => {
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
    if ((parts[1] || '').length > 2) return;

    const numValue = parseFloat(clean) || 0;
    const updated = [...payments];
    updated[index] = { ...updated[index], amount: numValue };
    onChange(updated);
  };

  const handleAmountBlur = (index: number) => {
    const row = payments[index];
    if (row?.income_code_id && row.amount > 0) {
      recalculateRow(index, row.amount);
    }
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
        {payments.map((row, idx) => (
          <div key={idx} className="rounded-md border border-violet-200 bg-background p-2 space-y-1.5">
            <div className="flex items-start gap-2">
              {/* Income Code Selector */}
              <div className="flex-1 min-w-[140px]">
                <Label className="text-[10px] text-muted-foreground">Income Code</Label>
                <Select
                  value={row.income_code_id || undefined}
                  onValueChange={(v) => handleCodeChange(idx, v)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select code" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCodes ? (
                      <div className="p-2 text-xs text-muted-foreground">Loading...</div>
                    ) : (
                      (incomeCodes || []).map(code => (
                        <SelectItem
                          key={code.id}
                          value={code.id}
                          disabled={usedCodeIds.includes(code.id) && row.income_code_id !== code.id}
                        >
                          {code.code} - {code.description}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="w-28">
                <Label className="text-[10px] text-muted-foreground">Amount</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={row.amount === 0 ? '' : String(row.amount)}
                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                  onBlur={() => handleAmountBlur(idx)}
                  className="h-8 text-xs text-right font-mono"
                  placeholder="0.00"
                  disabled={isReadOnly || !row.income_code_id}
                />
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
        ))}
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
