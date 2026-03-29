import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Info } from 'lucide-react';

interface ContactSuggestion {
  id: string;
  name: string;
  source: string; // 'Department Head' | 'Function Owner'
}

interface AuditeeContactSelectorProps {
  departmentId: string;
  functionId: string;
  departments: any[];
  deptFunctions: any[];
  primaryContactId: string;
  onPrimaryChange: (id: string) => void;
  secondaryContactIds: string[];
  onSecondaryChange: (ids: string[]) => void;
  manualContact: string;
  onManualContactChange: (val: string) => void;
}

const MANUAL_ENTRY_VALUE = '__manual__';

export function AuditeeContactSelector({
  departmentId,
  functionId,
  departments,
  deptFunctions,
  primaryContactId,
  onPrimaryChange,
  secondaryContactIds,
  onSecondaryChange,
  manualContact,
  onManualContactChange,
}: AuditeeContactSelectorProps) {
  // Build suggestion list from department head + function responsible_person
  const suggestions = useMemo<ContactSuggestion[]>(() => {
    const list: ContactSuggestion[] = [];
    const seen = new Set<string>();

    if (departmentId) {
      const dept = departments.find((d: any) => d.id === departmentId);
      if (dept?.head && !seen.has(dept.head.toLowerCase())) {
        const id = dept.head_profile_id || `dept-head-${dept.id}`;
        list.push({ id, name: dept.head, source: 'Department Head' });
        seen.add(dept.head.toLowerCase());
      }
    }

    // Function owners
    const funcs = functionId
      ? deptFunctions.filter((f: any) => f.id === functionId)
      : deptFunctions;

    funcs.forEach((fn: any) => {
      if (fn.responsible_person && !seen.has(fn.responsible_person.toLowerCase())) {
        const id = `func-owner-${fn.id}`;
        list.push({ id, name: fn.responsible_person, source: `Function: ${fn.function_name}` });
        seen.add(fn.responsible_person.toLowerCase());
      }
    });

    return list;
  }, [departmentId, functionId, departments, deptFunctions]);

  const primaryOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = suggestions.map(s => ({
      value: s.id,
      label: `${s.name} — ${s.source}`,
      searchText: s.name,
    }));
    opts.push({ value: MANUAL_ENTRY_VALUE, label: '✏️ Other (manual entry)' });
    return opts;
  }, [suggestions]);

  const showManualInput = primaryContactId === MANUAL_ENTRY_VALUE || (suggestions.length === 0 && !primaryContactId);
  const secondarySuggestions = suggestions.filter(s => s.id !== primaryContactId);

  const toggleSecondary = (id: string) => {
    if (secondaryContactIds.includes(id)) {
      onSecondaryChange(secondaryContactIds.filter(x => x !== id));
    } else {
      onSecondaryChange([...secondaryContactIds, id]);
    }
  };

  // Get display name for a contact id
  const getContactName = (id: string) => {
    const s = suggestions.find(s => s.id === id);
    return s?.name || manualContact || '—';
  };

  return (
    <div className="space-y-4">
      {/* Primary Contact */}
      <div className="space-y-1.5">
        <Label>Primary Auditee Contact {suggestions.length > 0 && <span className="text-destructive">*</span>}</Label>
        {suggestions.length > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />Suggested from Department/Function data
          </p>
        )}
        {suggestions.length > 0 ? (
          <SearchableSelect
            options={primaryOptions}
            value={primaryContactId}
            onValueChange={onPrimaryChange}
            placeholder="Select auditee contact..."
            searchPlaceholder="Search contacts..."
            emptyMessage="No contacts found"
          />
        ) : (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
              <Info className="h-3 w-3" />No maintained contacts found — enter manually
            </p>
            <Input
              value={manualContact}
              onChange={e => onManualContactChange(e.target.value)}
              placeholder="Name of the auditee contact"
            />
          </div>
        )}
      </div>

      {/* Manual input when "Other" is selected */}
      {showManualInput && suggestions.length > 0 && (
        <div>
          <Label>Contact Name (manual entry)</Label>
          <Input
            value={manualContact}
            onChange={e => onManualContactChange(e.target.value)}
            placeholder="Enter auditee contact name"
          />
        </div>
      )}

      {/* Secondary Contacts */}
      {secondarySuggestions.length > 0 && (
        <div>
          <Label>Secondary Auditee Contact(s)</Label>
          <p className="text-[10px] text-muted-foreground mb-1">Optional additional contacts</p>
          <div className="border rounded-md p-2 max-h-[100px] overflow-y-auto space-y-0.5 bg-background">
            {secondarySuggestions.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1">
                <Checkbox
                  checked={secondaryContactIds.includes(s.id)}
                  onCheckedChange={() => toggleSecondary(s.id)}
                />
                <span>{s.name}</span>
                <span className="text-[10px] text-muted-foreground">({s.source})</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
