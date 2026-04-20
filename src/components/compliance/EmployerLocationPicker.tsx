/**
 * EmployerLocationPicker
 *
 * Replaces free-text audit-location entry with a dropdown of the employer's
 * known addresses (HQ, mailing, branches from er_locations) plus an
 * "Other / off-site" option that falls back to a free-text input.
 *
 * - Auto-defaults to HQ.
 * - Emits the resolved address text plus a structured source descriptor
 *   so the caller can persist `location_source` and `location_id`.
 *
 * Designed to be drop-in for both:
 *   - check-in dialogs (start of visit)
 *   - audit planning (RescheduleVisitDialog etc.)
 */
import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin } from 'lucide-react';
import {
  employerLocationsService,
  EmployerLocationOption,
} from '@/services/employerLocationsService';

export interface PickedLocation {
  address: string;
  source: 'HQ' | 'MAILING' | 'BRANCH' | 'OTHER' | 'MANUAL';
  locationId: number | null;
}

interface Props {
  employerId?: string;
  /** Pre-existing address (e.g. from a saved inspection). */
  initialAddress?: string;
  initialSource?: PickedLocation['source'];
  initialLocationId?: number | null;
  onChange: (picked: PickedLocation) => void;
  disabled?: boolean;
  label?: string;
}

export function EmployerLocationPicker({
  employerId,
  initialAddress,
  initialSource,
  initialLocationId,
  onChange,
  disabled,
  label = 'Audit Location',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<EmployerLocationOption[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('HQ');
  const [freeText, setFreeText] = useState<string>(initialAddress ?? '');

  // Derive initial select value from the initial source
  useEffect(() => {
    if (initialSource === 'BRANCH' && initialLocationId != null) {
      setSelectedValue(`BRANCH:${initialLocationId}`);
    } else if (initialSource) {
      setSelectedValue(initialSource);
    }
  }, [initialSource, initialLocationId]);

  useEffect(() => {
    let alive = true;
    if (!employerId) return;
    setLoading(true);
    employerLocationsService.list(employerId).then((opts) => {
      if (!alive) return;
      setOptions(opts);
      // If nothing chosen yet and no initial, default to HQ (or first option)
      if (!initialSource && !initialAddress) {
        const def = employerLocationsService.pickDefault(opts);
        if (def) {
          setSelectedValue(def.value);
          onChange({
            address: def.address,
            source: def.kind === 'OTHER' ? 'MANUAL' : def.kind,
            locationId: def.locationId,
          });
        }
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerId]);

  const selected = useMemo(
    () => options.find((o) => o.value === selectedValue),
    [options, selectedValue]
  );

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    const opt = options.find((o) => o.value === value);
    if (!opt) return;
    if (opt.kind === 'OTHER') {
      onChange({ address: freeText, source: 'MANUAL', locationId: null });
    } else {
      onChange({ address: opt.address, source: opt.kind, locationId: opt.locationId });
    }
  };

  const handleFreeText = (val: string) => {
    setFreeText(val);
    onChange({ address: val, source: 'MANUAL', locationId: null });
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" /> {label}
      </Label>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading employer addresses…
        </div>
      ) : (
        <>
          <Select value={selectedValue} onValueChange={handleSelect} disabled={disabled || !employerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select audit location" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.isPrimary && <span className="text-primary mr-1">★</span>}
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected?.kind === 'OTHER' && (
            <Input
              placeholder="Enter actual audit location / address"
              value={freeText}
              onChange={(e) => handleFreeText(e.target.value)}
              disabled={disabled}
            />
          )}

          {selected && selected.kind !== 'OTHER' && (
            <p className="text-xs text-muted-foreground">
              {selected.address}
              {selected.activityType ? ` • ${selected.activityType}` : ''}
            </p>
          )}

          {!employerId && (
            <p className="text-xs text-muted-foreground italic">
              Select an employer first to load registered locations.
            </p>
          )}
        </>
      )}
    </div>
  );
}
