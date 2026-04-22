// ============================================
// PHASE 4 — Multi-Zone Filter (Compliance Head)
// ============================================
// Chip-based multi-select over ce_zones. UI filter only — does NOT mutate
// any backend RLS. Use the returned ids to client-filter candidates / plans.
// Inspectors / Senior Inspectors should pass `singleZoneOnly` to hide the
// add-more affordance and constrain to their assigned zone.
// ============================================
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useZones } from '@/hooks/useZones';
import { Check, MapPin, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (zoneIds: string[]) => void;
  /** When true (Inspector / Senior Inspector), only one zone can be selected. */
  singleZoneOnly?: boolean;
  /** Restrict the picker to a specific allow-list (e.g. user's assigned zones). */
  allowedZoneIds?: string[];
  className?: string;
  label?: string;
}

export function MultiZoneFilter({
  value,
  onChange,
  singleZoneOnly,
  allowedZoneIds,
  className,
  label = 'Zones',
}: Props) {
  const { data: zones = [], isLoading } = useZones();
  const [open, setOpen] = useState(false);

  const visibleZones = allowedZoneIds?.length
    ? zones.filter((z) => allowedZoneIds.includes(z.id))
    : zones;

  const selected = visibleZones.filter((z) => value.includes(z.id));

  const toggle = (id: string) => {
    if (singleZoneOnly) {
      onChange(value.includes(id) ? [] : [id]);
      setOpen(false);
      return;
    }
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {label}:
      </div>

      {selected.length === 0 ? (
        <Badge variant="outline" className="text-xs">
          All zones
        </Badge>
      ) : (
        selected.map((z) => (
          <Badge
            key={z.id}
            variant="secondary"
            className="text-xs gap-1 pr-1"
          >
            <span className="font-mono">{z.zone_code}</span>
            <span className="hidden sm:inline">{z.zone_name}</span>
            <button
              type="button"
              onClick={() => toggle(z.id)}
              className="ml-0.5 rounded-sm hover:bg-muted"
              aria-label={`Remove ${z.zone_name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isLoading || visibleZones.length === 0}
          >
            <Plus className="h-3 w-3 mr-1" />
            {singleZoneOnly ? 'Choose zone' : 'Add zone'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search zones…" />
            <CommandList>
              <CommandEmpty>No zones found.</CommandEmpty>
              <CommandGroup>
                {visibleZones.map((z) => {
                  const isSelected = value.includes(z.id);
                  return (
                    <CommandItem
                      key={z.id}
                      value={`${z.zone_code} ${z.zone_name}`}
                      onSelect={() => toggle(z.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="font-mono mr-2 text-xs">
                        {z.zone_code}
                      </span>
                      <span className="flex-1 truncate">{z.zone_name}</span>
                      {z.territory && (
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {z.territory}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && !singleZoneOnly && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => onChange([])}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
