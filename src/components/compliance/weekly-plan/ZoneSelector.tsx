// ============================================
// PHASE 4 — Zone Selector
// ============================================
// Reusable dropdown over ce_zones. Used by manager review and planner filters.
// ============================================
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useZones } from '@/hooks/useZones';
import { MapPin } from 'lucide-react';

interface Props {
  value: string | null;
  onChange: (zoneId: string | null) => void;
  allowAll?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const ALL_VALUE = '__all__';

export function ZoneSelector({
  value,
  onChange,
  allowAll = true,
  placeholder = 'Select zone',
  className,
  disabled,
}: Props) {
  const { data: zones, isLoading } = useZones();

  return (
    <Select
      value={value ?? (allowAll ? ALL_VALUE : '')}
      onValueChange={(v) => onChange(v === ALL_VALUE ? null : v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder={isLoading ? 'Loading zones…' : placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL_VALUE}>All zones</SelectItem>}
        {(zones ?? []).map((z) => (
          <SelectItem key={z.id} value={z.id}>
            <span className="font-mono mr-2">{z.zone_code}</span>
            <span>{z.zone_name}</span>
            {z.territory && (
              <span className="ml-2 text-xs text-muted-foreground">({z.territory})</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
