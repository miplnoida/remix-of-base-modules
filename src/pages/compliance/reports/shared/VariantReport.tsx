import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, Inbox } from 'lucide-react';
import { exportReportToExcel } from '@/utils/reportExcelExport';
import { REPORT_VARIANTS, type ReportVariantKey } from './reportVariants';

interface Props {
  variant: ReportVariantKey;
}

export default function VariantReport({ variant }: Props) {
  const cfg = REPORT_VARIANTS[variant];
  if (!cfg) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Unknown report variant: {variant}</p>
      </div>
    );
  }

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});

  const { data: rawRows = [], isLoading } = useQuery({
    queryKey: ['compliance_variant_report_v2', variant],
    queryFn: cfg.loadRows,
  });

  const rows = useMemo(() => {
    if (!cfg.filterRow) return rawRows;
    return (rawRows as any[]).filter((r) => cfg.filterRow!(r, applied));
  }, [rawRows, applied, cfg]);

  const handleApply = () => setApplied(draft);

  const handleExport = async () => {
    await exportReportToExcel(
      (rows as any[]).map((r) => {
        const out: Record<string, any> = {};
        cfg.columns.forEach((c) => {
          out[c.key] = c.format ? c.format(r[c.key], r) : r[c.key];
        });
        return out;
      }),
      cfg.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 })),
      cfg.exportFileName,
      cfg.exportSheet,
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: cfg.group, href: cfg.groupHref },
          { label: cfg.title },
        ]}
      />

      {cfg.filters.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {cfg.filters.includes('date-range') && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">From</label>
                    <Input type="date" value={draft.from ?? ''} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">To</label>
                    <Input type="date" value={draft.to ?? ''} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
                  </div>
                </>
              )}
              {cfg.filters.includes('zone') && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Zone</label>
                  <Select value={draft.zone ?? 'all'} onValueChange={(v) => setDraft({ ...draft, zone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      <SelectItem value="Zone A">Zone A</SelectItem>
                      <SelectItem value="Zone B">Zone B</SelectItem>
                      <SelectItem value="Zone C">Zone C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-end md:col-start-4">
                <Button className="w-full" onClick={handleApply}>Apply Filters</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {cfg.kpis && cfg.kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {cfg.kpis.map((k, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold text-foreground">{String(k.compute(rows as any[]))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{cfg.title} — Details</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={(rows as any[]).length === 0}>
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (rows as any[]).length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground max-w-md">{cfg.emptyMessage}</p>
              <Link to={cfg.groupHref} className="text-sm text-primary mt-3 underline">Back to {cfg.group} Summary</Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {cfg.columns.map((c) => (
                    <TableHead key={c.key} className={c.numeric ? 'text-right' : ''}>{c.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as any[]).map((row, idx) => (
                  <TableRow key={row.id ?? idx}>
                    {cfg.columns.map((c) => {
                      const raw = row[c.key];
                      const val = c.format ? c.format(raw, row) : (raw ?? '—');
                      return (
                        <TableCell key={c.key} className={c.numeric ? 'text-right' : ''}>{String(val ?? '')}</TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
