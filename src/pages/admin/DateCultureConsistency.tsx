import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { getDateDisplayFormat } from '@/lib/culture/culture';

/**
 * Date / Culture Consistency Check
 * Validates that there is a single source of truth for date culture settings.
 */
export default function DateCultureConsistency() {
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['culture-consistency-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, category')
        .or(
          'setting_key.ilike.%date%,setting_key.ilike.%culture%,setting_key.ilike.%locale%,setting_key.ilike.%timezone%',
        );
      if (error) throw error;
      return data ?? [];
    },
  });

  const dateKeys = settings.filter((s) =>
    /date_?format|date_?display|culture|locale/i.test(s.setting_key),
  );

  const duplicateDateFormatKeys = dateKeys.filter(
    (s) => s.setting_key !== 'display_date_format' && /date_?format/i.test(s.setting_key),
  );

  const moduleScopedKeys = dateKeys.filter((s) =>
    /^(bn|portal|c3|claim|er|ip|compliance)_/i.test(s.setting_key),
  );

  const checks = [
    {
      label: 'Single date display format key (display_date_format)',
      ok: duplicateDateFormatKeys.length === 0,
      detail:
        duplicateDateFormatKeys.length === 0
          ? `Active value: ${getDateDisplayFormat()}`
          : `Found duplicates: ${duplicateDateFormatKeys.map((k) => k.setting_key).join(', ')}`,
    },
    {
      label: 'No module-specific date format setting',
      ok: moduleScopedKeys.length === 0,
      detail:
        moduleScopedKeys.length === 0
          ? 'All modules consume Global Settings'
          : `Module-scoped keys found: ${moduleScopedKeys.map((k) => k.setting_key).join(', ')}`,
    },
    {
      label: 'No separate BN / portal date settings',
      ok: !dateKeys.some((s) => /^(bn|portal)_.*date/i.test(s.setting_key)),
      detail: 'Single Global Settings source applies to BN, portals, and all modules',
    },
  ];

  const guidance = [
    'Use src/lib/culture/culture.ts for all date / number / money formatting.',
    'Use <CultureDateInput />, <CultureDateTimeInput />, <CultureMoneyInput />, <CultureNumberInput /> for input fields.',
    'Never call toLocaleDateString / toLocaleString / Intl.DateTimeFormat outside culture.ts.',
    'Never hardcode date formats like DD/MM/YYYY or MM/DD/YYYY in components.',
    'Storage formats are immutable: dates → YYYY-MM-DD, datetimes → ISO 8601, money/numbers → numeric.',
  ];

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Date / Culture Consistency</CardTitle>
          <CardDescription>
            Verifies a single source of truth for date and culture formatting across all modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            checks.map((c) => (
              <div
                key={c.label}
                className="flex items-start gap-3 p-3 rounded-md border bg-card"
              >
                {c.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
                <Badge variant={c.ok ? 'default' : 'destructive'}>
                  {c.ok ? 'OK' : 'Issue'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engineering Guidance</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {guidance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
