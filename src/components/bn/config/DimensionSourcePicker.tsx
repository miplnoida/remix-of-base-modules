/**
 * DimensionSourcePicker — two-step picker:
 *   1) pick a Source (Fact / Derived Fact / Product Parameter / Claim/Medical/Beneficiary Field)
 *   2) pick a specific item from that registry
 * Calls onPick with normalized dimension metadata (key, label, type, allowed match types).
 */
import { useEffect, useState } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Loader2 } from 'lucide-react';
import {
  DIMENSION_SOURCE_LABELS,
  loadDimensionSource,
  type DimensionSourceItem,
  type DimensionSourceKind,
} from '@/services/bn/rateTableDimensionSources';

interface Props {
  value?: { kind?: DimensionSourceKind; dimension_key?: string };
  onPick: (item: DimensionSourceItem) => void;
  compact?: boolean;
}

const SOURCE_ORDER: DimensionSourceKind[] = [
  'FACT', 'DERIVED_FACT', 'PRODUCT_PARAMETER',
  'CLAIM_FIELD', 'MEDICAL_FIELD', 'BENEFICIARY_FIELD',
];

export function DimensionSourcePicker({ value, onPick, compact }: Props) {
  const [kind, setKind] = useState<DimensionSourceKind>(value?.kind ?? 'FACT');
  const [items, setItems] = useState<DimensionSourceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadDimensionSource(kind).then((res) => {
      if (alive) { setItems(res); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [kind]);

  return (
    <div className={compact ? 'flex gap-1.5' : 'grid grid-cols-2 gap-2'}>
      <Select value={kind} onValueChange={(v) => setKind(v as DimensionSourceKind)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SOURCE_ORDER.map((k) => (
            <SelectItem key={k} value={k}>{DIMENSION_SOURCE_LABELS[k]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative">
        <SearchableSelect
          value={value?.dimension_key ?? ''}
          onValueChange={(v) => {
            const it = items.find((x) => x.dimension_key === v);
            if (it) onPick(it);
          }}
          placeholder={loading ? 'Loading…' : 'Pick field…'}
          disabled={loading}
          options={items.map((i) => ({
            value: i.dimension_key,
            label: `${i.label} — ${i.dimension_key}`,
          }))}
        />
        {loading && <Loader2 className="h-3.5 w-3.5 absolute right-8 top-2 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
