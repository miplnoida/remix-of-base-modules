import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown, Hash } from 'lucide-react';
import { format } from 'date-fns';

export interface Segment {
  type: 'static' | 'placeholder';
  value: string;
  min_length?: number;
}

interface NumberFormatSegmentBuilderProps {
  title: string;
  description: string;
  configKey: string;
  segments: Segment[];
  onChange: (segments: Segment[]) => void;
  onSave: () => void;
  saving: boolean;
  /** Placeholders that support min_length */
  lengthPlaceholders?: string[];
}

const ALL_PLACEHOLDERS = [
  { value: 'YYYY', label: 'Year (4-digit)', example: '2026' },
  { value: 'YY', label: 'Year (2-digit)', example: '26' },
  { value: 'MM', label: 'Month', example: '03' },
  { value: 'DD', label: 'Day', example: '27' },
  { value: 'YYYYMM', label: 'Year-Month', example: '202603' },
  { value: 'YYYYMMDD', label: 'Date YYYYMMDD', example: '20260327' },
  { value: 'DDMMYYYY', label: 'Date DDMMYYYY', example: '27032026' },
  { value: 'DDMMYYYYHHMM', label: 'DateTime', example: '270320261430' },
  { value: 'HH', label: 'Hour', example: '14' },
  { value: 'MI', label: 'Minutes', example: '30' },
  { value: 'SS', label: 'Seconds', example: '25' },
  { value: 'HHMM', label: 'Time HHMM', example: '1430' },
  { value: 'HHMMSS', label: 'Time HHMMSS', example: '143025' },
  { value: 'SEQ', label: 'Auto Sequence', example: '001' },
  { value: 'OFFICE_CODE', label: 'Office Code', example: 'HQ' },
  { value: 'PAYER_ID', label: 'Payer ID', example: '100234' },
  { value: 'PAYER_TYPE', label: 'Payer Type', example: 'ER' },
  { value: 'USER_CODE', label: 'User Code', example: 'JD01' },
  { value: 'RECEIPT_ID', label: 'Receipt ID', example: '42' },
  { value: 'INVOICE_ID', label: 'Invoice ID', example: '15' },
  { value: 'BATCH_NUMBER', label: 'Batch Number', example: 'HQ-20260327-143025' },
];

const EXAMPLE_VALUES: Record<string, string> = {};
ALL_PLACEHOLDERS.forEach(p => { EXAMPLE_VALUES[p.value] = p.example; });

// resolve date placeholders with real values for preview
function resolveForPreview(placeholder: string): string {
  const now = new Date();
  const map: Record<string, string> = {
    YYYY: format(now, 'yyyy'),
    YY: format(now, 'yy'),
    MM: format(now, 'MM'),
    DD: format(now, 'dd'),
    YYYYMM: format(now, 'yyyyMM'),
    YYYYMMDD: format(now, 'yyyyMMdd'),
    DDMMYYYY: format(now, 'ddMMyyyy'),
    DDMMYYYYHHMM: format(now, 'ddMMyyyyHHmm'),
    HH: format(now, 'HH'),
    MI: format(now, 'mm'),
    SS: format(now, 'ss'),
    HHMM: format(now, 'HHmm'),
    HHMMSS: format(now, 'HHmmss'),
  };
  return map[placeholder] || EXAMPLE_VALUES[placeholder] || placeholder;
}

export function previewSegments(segments: Segment[]): string {
  if (!segments || segments.length === 0) return '—';
  return segments.map(seg => {
    if (seg.type === 'static') return seg.value;
    let val = resolveForPreview(seg.value);
    if (seg.min_length && seg.min_length > 0) {
      val = val.padStart(seg.min_length, '0');
    }
    return val;
  }).join('');
}

const NumberFormatSegmentBuilder: React.FC<NumberFormatSegmentBuilderProps> = ({
  title, description, segments, onChange, onSave, saving,
}) => {
  const [addType, setAddType] = useState<'static' | 'placeholder'>('placeholder');
  const [addValue, setAddValue] = useState('');
  const [addPlaceholder, setAddPlaceholder] = useState('');

  const preview = useMemo(() => previewSegments(segments), [segments]);

  // Check if SEQ already used
  const hasSeq = segments.some(s => s.type === 'placeholder' && s.value === 'SEQ');

  const moveSegment = (index: number, dir: -1 | 1) => {
    const newSegs = [...segments];
    const target = index + dir;
    if (target < 0 || target >= newSegs.length) return;
    [newSegs[index], newSegs[target]] = [newSegs[target], newSegs[index]];
    onChange(newSegs);
  };

  const removeSegment = (index: number) => {
    onChange(segments.filter((_, i) => i !== index));
  };

  const updateMinLength = (index: number, val: number) => {
    const newSegs = [...segments];
    newSegs[index] = { ...newSegs[index], min_length: val > 0 ? val : undefined };
    onChange(newSegs);
  };

  const addSegment = () => {
    if (addType === 'static') {
      if (!addValue.trim()) return;
      onChange([...segments, { type: 'static', value: addValue.trim() }]);
      setAddValue('');
    } else {
      if (!addPlaceholder) return;
      // Prevent duplicate SEQ
      if (addPlaceholder === 'SEQ' && hasSeq) return;
      const newSeg: Segment = { type: 'placeholder', value: addPlaceholder };
      if (addPlaceholder === 'SEQ') newSeg.min_length = 3;
      onChange([...segments, newSeg]);
      setAddPlaceholder('');
    }
  };

  const isValid = segments.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Segments list */}
        <div className="space-y-2">
          {segments.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">No segments configured. Add segments below.</p>
          )}
          {segments.map((seg, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-md border p-2 bg-background">
              <Badge variant={seg.type === 'static' ? 'secondary' : 'default'} className="text-[10px] shrink-0 w-16 justify-center">
                {seg.type === 'static' ? 'Static' : 'Placeholder'}
              </Badge>
              <code className="font-mono text-sm flex-1 truncate">
                {seg.type === 'static' ? seg.value : `{${seg.value}}`}
              </code>
              {seg.type === 'placeholder' && (
                <div className="flex items-center gap-1 shrink-0">
                  <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Len:</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={seg.min_length || ''}
                    onChange={e => updateMinLength(idx, parseInt(e.target.value) || 0)}
                    className="w-14 h-7 text-xs"
                    placeholder="—"
                  />
                </div>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSegment(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSegment(idx, 1)} disabled={idx === segments.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSegment(idx)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add segment */}
        <div className="flex items-end gap-2 rounded-md border border-dashed p-3 bg-muted/30">
          <div className="space-y-1">
            <Label className="text-[10px]">Type</Label>
            <Select value={addType} onValueChange={(v) => setAddType(v as 'static' | 'placeholder')}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static Text</SelectItem>
                <SelectItem value="placeholder">Placeholder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {addType === 'static' ? (
            <div className="space-y-1 flex-1">
              <Label className="text-[10px]">Text</Label>
              <Input
                value={addValue}
                onChange={e => setAddValue(e.target.value)}
                placeholder="e.g. INV- or /"
                className="h-8 text-xs font-mono"
              />
            </div>
          ) : (
            <div className="space-y-1 flex-1">
              <Label className="text-[10px]">Placeholder</Label>
              <Select value={addPlaceholder} onValueChange={setAddPlaceholder}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PLACEHOLDERS.map(p => (
                    <SelectItem
                      key={p.value}
                      value={p.value}
                      disabled={p.value === 'SEQ' && hasSeq}
                    >
                      <span className="font-mono">{`{${p.value}}`}</span>
                      <span className="text-muted-foreground ml-1 text-xs">— {p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button size="sm" variant="outline" className="h-8" onClick={addSegment}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {/* Live preview */}
        <div className="rounded-md bg-muted p-3">
          <Label className="text-xs text-muted-foreground">Live Preview</Label>
          <p className="font-mono text-sm text-foreground mt-1">{preview}</p>
        </div>

        {/* Save */}
        <Button size="sm" onClick={onSave} disabled={saving || !isValid}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
};

export default NumberFormatSegmentBuilder;
