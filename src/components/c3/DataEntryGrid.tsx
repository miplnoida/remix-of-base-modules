import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Check, Loader2, AlertCircle, X, Keyboard } from 'lucide-react';
import { useEmployerValidation } from '@/hooks/useEmployerValidation';
import { getMondayCount, getEnabledWeekTextboxes } from '@/utils/weekCalculations';
import { EmployeeData } from '@/components/c3/EmployeeModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GridRow {
  id: string; // temp id for keying
  ssn: string;
  name: string;
  payPeriod: string;
  dateOfBirth: string;
  weeklyWages: number[];
  wageInputs: string[];
  days: boolean[];
  ssnValidated: boolean;
  ssnError: string;
  isValidating: boolean;
  isSaving: boolean;
  isSaved: boolean;
  isExisting: boolean; // true if editing an existing employee
  hasChanges: boolean;
}

interface DataEntryGridProps {
  periodYear: number;
  periodMonth: number;
  receivedDate: string;
  employees: EmployeeData[];
  onSaveEmployee: (employee: EmployeeData) => void;
  onDeleteEmployee?: (employee: EmployeeData) => void;
  allEmployees: EmployeeData[];
  isViewMode?: boolean;
}

const EMPTY_WAGES = [0, 0, 0, 0, 0, 0, 0];
const EMPTY_INPUTS = ['', '', '', '', '', '', ''];
const EMPTY_DAYS = [false, false, false, false, false, false, false];

let rowIdCounter = 0;
function nextRowId() { return `grid-row-${++rowIdCounter}`; }

export default function DataEntryGrid({
  periodYear,
  periodMonth,
  receivedDate,
  employees,
  onSaveEmployee,
  onDeleteEmployee,
  allEmployees,
  isViewMode = false,
}: DataEntryGridProps) {
  const { toast } = useToast();
  const { validateEmployee } = useEmployerValidation();
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLButtonElement>>(new Map());

  const mondayCount = getMondayCount(periodYear, periodMonth);
  const generatedWeekIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < mondayCount && i < 5; i++) indices.push(i);
    return indices;
  }, [mondayCount]);

  const periodTermStartDate = useMemo(() => {
    const monthStr = String(periodMonth + 1).padStart(2, '0');
    return `${periodYear}-${monthStr}-01`;
  }, [periodYear, periodMonth]);

  // Grid rows state
  const [rows, setRows] = useState<GridRow[]>([]);

  // Initialize with one empty row
  useEffect(() => {
    if (rows.length === 0) {
      addNewRow();
    }
  }, []);

  function createEmptyRow(): GridRow {
    const days = [...EMPTY_DAYS];
    // Auto-mark generated weeks as present
    for (const idx of generatedWeekIndices) days[idx] = true;
    return {
      id: nextRowId(),
      ssn: '',
      name: '',
      payPeriod: 'Monthly',
      dateOfBirth: '',
      weeklyWages: [...EMPTY_WAGES],
      wageInputs: [...EMPTY_INPUTS],
      days,
      ssnValidated: false,
      ssnError: '',
      isValidating: false,
      isSaving: false,
      isSaved: false,
      isExisting: false,
      hasChanges: false,
    };
  }

  function addNewRow() {
    setRows(prev => [...prev, createEmptyRow()]);
    // Focus SSN of new row after render
    setTimeout(() => {
      const newRow = rows.length; // will be the index of the new row
      focusCell(newRow, 'ssn');
    }, 50);
  }

  // Cell reference management
  const setCellRef = useCallback((rowIdx: number, field: string, el: HTMLInputElement | HTMLButtonElement | null) => {
    const key = `${rowIdx}-${field}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const focusCell = useCallback((rowIdx: number, field: string) => {
    setTimeout(() => {
      const key = `${rowIdx}-${field}`;
      const el = cellRefs.current.get(key);
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) el.select();
      }
    }, 20);
  }, []);

  // Column order for tab navigation
  const columnOrder = useMemo(() => {
    const cols = ['ssn', 'payPeriod'];
    for (const idx of generatedWeekIndices) cols.push(`w${idx}`);
    cols.push('bonus', 'holiday', 'save');
    return cols;
  }, [generatedWeekIndices]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIdx: number, field: string) => {
    const colIdx = columnOrder.indexOf(field);

    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'save') {
        // Save is handled by button click, but also trigger it
        handleSaveRow(rowIdx);
      } else {
        // Move to next row same column, or save current if last row
        if (rowIdx < rows.length - 1) {
          focusCell(rowIdx + 1, field);
        } else {
          // If this is the last row, try to save and add new row
          focusCell(rowIdx, 'save');
        }
      }
      return;
    }

    if (e.key === 'Tab') {
      // Default tab behavior is fine, but ensure it flows within the grid
      const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (nextCol >= 0 && nextCol < columnOrder.length) {
        e.preventDefault();
        focusCell(rowIdx, columnOrder[nextCol]);
      } else if (!e.shiftKey && nextCol >= columnOrder.length) {
        // Move to next row's first column
        if (rowIdx < rows.length - 1) {
          e.preventDefault();
          focusCell(rowIdx + 1, columnOrder[0]);
        }
      } else if (e.shiftKey && nextCol < 0) {
        // Move to previous row's last column
        if (rowIdx > 0) {
          e.preventDefault();
          focusCell(rowIdx - 1, columnOrder[columnOrder.length - 1]);
        }
      }
      return;
    }

    // Arrow keys
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIdx < rows.length - 1) focusCell(rowIdx + 1, field);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIdx > 0) focusCell(rowIdx - 1, field);
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value?.length) {
      if (colIdx < columnOrder.length - 1) {
        e.preventDefault();
        focusCell(rowIdx, columnOrder[colIdx + 1]);
      }
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      if (colIdx > 0) {
        e.preventDefault();
        focusCell(rowIdx, columnOrder[colIdx - 1]);
      }
    }

    // Escape to remove unsaved empty row
    if (e.key === 'Escape' && !rows[rowIdx]?.isExisting && !rows[rowIdx]?.ssnValidated) {
      if (rows.length > 1) {
        setRows(prev => prev.filter((_, i) => i !== rowIdx));
      }
    }
  }, [rows, columnOrder, focusCell]);

  // SSN validation
  const handleSSNBlur = useCallback(async (rowIdx: number) => {
    const row = rows[rowIdx];
    if (!row || !row.ssn || row.ssn.length !== 6) {
      if (row?.ssn && row.ssn.length > 0 && row.ssn.length !== 6) {
        updateRow(rowIdx, { ssnError: 'SSN must be 6 digits', ssnValidated: false });
      }
      return;
    }

    // Check duplicate
    const isDuplicate = allEmployees.some(emp => emp.ssn === row.ssn) ||
      rows.some((r, i) => i !== rowIdx && r.ssn === row.ssn && r.ssnValidated);
    if (isDuplicate) {
      updateRow(rowIdx, { ssnError: 'Duplicate SSN', ssnValidated: false });
      return;
    }

    updateRow(rowIdx, { isValidating: true, ssnError: '' });
    const result = await validateEmployee(row.ssn);
    if (result.isValid) {
      updateRow(rowIdx, {
        name: result.name,
        dateOfBirth: result.dateOfBirth,
        ssnValidated: true,
        ssnError: '',
        isValidating: false,
      });

      // Fetch default pay period
      try {
        const { data } = await supabase
          .from('ip_wages')
          .select('pay_period')
          .eq('ssn', row.ssn)
          .eq('payer_type', 'ER')
          .order('date_entered', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.pay_period) {
          const map: Record<string, string> = { '1': 'Monthly', '2': 'Bi-Weekly', '3': 'Weekly', '4': '2 Monthly' };
          const mapped = map[String(data.pay_period)] || 'Monthly';
          updateRow(rowIdx, { payPeriod: mapped });
        }
      } catch { /* ignore */ }
    } else {
      updateRow(rowIdx, { ssnError: result.error || 'Invalid SSN', ssnValidated: false, isValidating: false });
    }
  }, [rows, allEmployees, validateEmployee]);

  const updateRow = useCallback((rowIdx: number, updates: Partial<GridRow>) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, ...updates, hasChanges: true } : r));
  }, []);

  // Wage change with auto-fill
  const handleWageChange = useCallback((rowIdx: number, weekIdx: number, value: string) => {
    const clean = value.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    if ((parts[0] || '').length > 8) return;
    if ((parts[1] || '').length > 2) return;

    const numValue = parseFloat(clean) || 0;

    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const newInputs = [...r.wageInputs];
      const newWages = [...r.weeklyWages];
      const newDays = [...r.days];

      newInputs[weekIdx] = clean;
      newWages[weekIdx] = numValue;

      // Auto-fill: if entering a weekly wage (0-4) and all others are blank
      if (weekIdx < 5 && numValue > 0) {
        const allBlank = generatedWeekIndices.every(j => j === weekIdx || (r.weeklyWages[j] || 0) === 0);
        if (allBlank) {
          for (const j of generatedWeekIndices) {
            newWages[j] = numValue;
            newInputs[j] = clean;
            newDays[j] = true;
          }
        }
      }

      return { ...r, weeklyWages: newWages, wageInputs: newInputs, days: newDays, hasChanges: true, isSaved: false };
    }));
  }, [generatedWeekIndices]);

  // Save row
  const handleSaveRow = useCallback(async (rowIdx: number) => {
    const row = rows[rowIdx];
    if (!row) return;

    if (!row.ssnValidated) {
      updateRow(rowIdx, { ssnError: 'Please enter a valid SSN first' });
      return;
    }

    updateRow(rowIdx, { isSaving: true });

    const enabledTextboxes = getEnabledWeekTextboxes(row.payPeriod || 'Monthly', periodYear, periodMonth, periodTermStartDate);
    const effectiveWages = row.weeklyWages.map((w, i) => {
      if (i < 5) return (row.days[i] && enabledTextboxes[i]) ? w : 0;
      if (i === 5) return row.days[5] ? w : 0;
      if (i === 6) return row.days[6] ? w : 0;
      return w;
    });

    const savedEmployee: EmployeeData = {
      ssn: row.ssn,
      name: row.name,
      days: row.days,
      categories: [false, false, false],
      wages: 0,
      bonus: effectiveWages[5],
      totalWages: effectiveWages.reduce((a, b) => a + b, 0),
      hssdLevy: 0,
      socialSecurity: 0,
      isVerified: false,
      weeklyWages: effectiveWages,
      termStartDate: periodTermStartDate,
      payPeriod: row.payPeriod || 'Monthly',
      dateOfBirth: row.dateOfBirth,
    };

    try {
      onSaveEmployee(savedEmployee);

      updateRow(rowIdx, { isSaving: false, isSaved: true, hasChanges: false, isExisting: true });

      toast({
        title: "Employee Saved",
        description: `${row.name || row.ssn} saved successfully.`,
        duration: 2000,
      });

      // Focus next row's SSN or add new row
      if (rowIdx === rows.length - 1) {
        addNewRow();
        setTimeout(() => focusCell(rowIdx + 1, 'ssn'), 100);
      } else {
        focusCell(rowIdx + 1, 'ssn');
      }
    } catch (err) {
      updateRow(rowIdx, { isSaving: false });
      toast({ title: "Save Failed", description: "Could not save employee.", variant: "destructive" });
    }
  }, [rows, periodYear, periodMonth, periodTermStartDate, onSaveEmployee, toast, focusCell]);

  // Delete unsaved row
  const handleDeleteRow = useCallback((rowIdx: number) => {
    const row = rows[rowIdx];
    if (row.isExisting && onDeleteEmployee) {
      onDeleteEmployee({
        ssn: row.ssn, name: row.name, days: row.days,
        categories: [false, false, false], wages: 0, bonus: 0,
        totalWages: 0, hssdLevy: 0, socialSecurity: 0,
        isVerified: false, weeklyWages: row.weeklyWages,
      });
    }
    if (rows.length > 1) {
      setRows(prev => prev.filter((_, i) => i !== rowIdx));
    } else {
      setRows([createEmptyRow()]);
    }
  }, [rows, onDeleteEmployee]);

  // Shortcut: Ctrl+N or Alt+N to add new row
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.altKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        addNewRow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rows]);

  if (isViewMode) return null;

  return (
    <div ref={gridRef} className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Data Entry Mode</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">
            {rows.filter(r => r.isSaved).length} saved / {rows.length} rows
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground hidden md:inline">
            Tab: next cell · Enter: next row · Ctrl+N: new row · Esc: remove empty row
          </span>
          <Button size="sm" variant="outline" onClick={addNewRow}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Row
          </Button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[100px]">SSN</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[140px]">Name</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[110px]">Pay Period</th>
              {generatedWeekIndices.map(idx => (
                <th key={idx} className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground min-w-[80px]">W{idx + 1}</th>
              ))}
              <th className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground min-w-[80px]">Bonus</th>
              <th className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground min-w-[80px]">Holiday</th>
              <th className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground min-w-[80px]">Total</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground w-[80px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const enabledTextboxes = getEnabledWeekTextboxes(row.payPeriod || 'Monthly', periodYear, periodMonth, periodTermStartDate);
              const totalWages = row.weeklyWages.reduce((a, b) => a + b, 0);
              const rowBg = row.ssnError
                ? 'bg-destructive/5'
                : row.isSaved && !row.hasChanges
                  ? 'bg-green-50/50'
                  : row.hasChanges
                    ? 'bg-amber-50/50'
                    : 'bg-background';

              return (
                <tr key={row.id} className={`border-b transition-colors ${rowBg}`}>
                  {/* Row number */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground font-mono">{rowIdx + 1}</span>
                      {row.isSaved && !row.hasChanges && <Check className="h-3 w-3 text-green-600" />}
                      {row.hasChanges && row.isExisting && <div className="h-2 w-2 rounded-full bg-amber-500" />}
                    </div>
                  </td>

                  {/* SSN */}
                  <td className="px-1 py-1">
                    <div className="relative">
                      <Input
                        ref={(el) => setCellRef(rowIdx, 'ssn', el)}
                        value={row.ssn}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                          updateRow(rowIdx, { ssn: v, ssnValidated: false, ssnError: '' });
                        }}
                        onBlur={() => handleSSNBlur(rowIdx)}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'ssn')}
                        placeholder="SSN"
                        maxLength={6}
                        disabled={row.isExisting}
                        className={`h-8 text-xs font-mono px-2 ${
                          row.ssnError ? 'border-destructive focus-visible:ring-destructive' :
                          row.ssnValidated ? 'border-green-500' : ''
                        }`}
                      />
                      {row.isValidating && <Loader2 className="absolute right-1.5 top-2 h-3 w-3 animate-spin text-muted-foreground" />}
                      {row.ssnValidated && !row.isValidating && <Check className="absolute right-1.5 top-2 h-3 w-3 text-green-600" />}
                    </div>
                    {row.ssnError && (
                      <p className="text-[10px] text-destructive leading-tight mt-0.5 px-1">{row.ssnError}</p>
                    )}
                  </td>

                  {/* Name (read-only) */}
                  <td className="px-1 py-1">
                    <div className="h-8 flex items-center px-2 text-xs text-muted-foreground bg-muted/30 rounded-md border border-transparent truncate">
                      {row.name || '—'}
                    </div>
                  </td>

                  {/* Pay Period */}
                  <td className="px-1 py-1">
                    <Select
                      value={row.payPeriod}
                      onValueChange={(v) => updateRow(rowIdx, { payPeriod: v })}
                    >
                      <SelectTrigger
                        ref={(el) => setCellRef(rowIdx, 'payPeriod', el as any)}
                        className="h-8 text-xs px-2"
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'payPeriod')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="2 Monthly">2 Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Weekly wages */}
                  {generatedWeekIndices.map(weekIdx => {
                    const enabled = row.days[weekIdx] && enabledTextboxes[weekIdx];
                    return (
                      <td key={weekIdx} className="px-1 py-1">
                        <Input
                          ref={(el) => setCellRef(rowIdx, `w${weekIdx}`, el)}
                          type="text"
                          inputMode="decimal"
                          value={row.wageInputs[weekIdx]}
                          onChange={(e) => handleWageChange(rowIdx, weekIdx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, `w${weekIdx}`)}
                          placeholder="0.00"
                          disabled={!enabled}
                          className="h-8 text-xs text-right font-mono px-2"
                        />
                      </td>
                    );
                  })}

                  {/* Bonus */}
                  <td className="px-1 py-1">
                    <Input
                      ref={(el) => setCellRef(rowIdx, 'bonus', el)}
                      type="text"
                      inputMode="decimal"
                      value={row.wageInputs[5]}
                      onChange={(e) => {
                        handleWageChange(rowIdx, 5, e.target.value);
                        // Auto-mark bonus presence
                        const numVal = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                        if (numVal > 0) {
                          setRows(prev => prev.map((r, i) => {
                            if (i !== rowIdx) return r;
                            const newDays = [...r.days];
                            newDays[5] = true;
                            return { ...r, days: newDays };
                          }));
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, rowIdx, 'bonus')}
                      placeholder="0.00"
                      className="h-8 text-xs text-right font-mono px-2"
                    />
                  </td>

                  {/* Holiday */}
                  <td className="px-1 py-1">
                    <Input
                      ref={(el) => setCellRef(rowIdx, 'holiday', el)}
                      type="text"
                      inputMode="decimal"
                      value={row.wageInputs[6]}
                      onChange={(e) => {
                        handleWageChange(rowIdx, 6, e.target.value);
                        const numVal = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                        if (numVal > 0) {
                          setRows(prev => prev.map((r, i) => {
                            if (i !== rowIdx) return r;
                            const newDays = [...r.days];
                            newDays[6] = true;
                            return { ...r, days: newDays };
                          }));
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, rowIdx, 'holiday')}
                      placeholder="0.00"
                      className="h-8 text-xs text-right font-mono px-2"
                    />
                  </td>

                  {/* Total */}
                  <td className="px-2 py-1">
                    <div className="h-8 flex items-center justify-end text-xs font-mono font-semibold text-foreground">
                      ${totalWages.toFixed(2)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-1 py-1">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        ref={(el) => setCellRef(rowIdx, 'save', el as any)}
                        size="icon"
                        variant={row.isSaved && !row.hasChanges ? 'ghost' : 'default'}
                        className="h-7 w-7"
                        onClick={() => handleSaveRow(rowIdx)}
                        disabled={row.isSaving || !row.ssnValidated}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'save')}
                        title="Save row (Enter)"
                      >
                        {row.isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : row.isSaved && !row.hasChanges ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {!row.isExisting && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteRow(rowIdx)}
                          title="Remove row (Esc)"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500" /> Saved</span>
        <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-500" /> Unsaved changes</span>
        <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-destructive" /> Validation error</span>
      </div>
    </div>
  );
}
