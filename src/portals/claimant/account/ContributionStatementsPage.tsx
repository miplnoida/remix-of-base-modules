import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Printer } from 'lucide-react';
import { useExternalContributions } from '@/portals/_shared/externalHooks';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';

export default function ContributionStatementsPage() {
  const { data, isLoading } = useExternalContributions();
  const { persona, userId } = useClaimantPersona();
  const printRef = useRef<HTMLDivElement>(null);
  const rows = (data?.contributions ?? []) as any[];

  function printStatement() {
    auditPortalAction('STATEMENT_DOWNLOADED', { userId, targetSsn: persona?.personSsn, payload: { format: 'print' } });
    if (!printRef.current) return;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Contribution Statement</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px}
        h1{font-size:18px;margin:0 0 4px}
        h2{font-size:13px;margin:0;color:#555;font-weight:400}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        thead{background:#f3f4f6}
        .brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
        .footer{margin-top:24px;font-size:10px;color:#666;border-top:1px solid #ccc;padding-top:8px}
      </style></head><body>
      <div class="brand">
        <div>
          <h1>Social Security Self-Service Portal</h1>
          <h2>Contribution Statement</h2>
        </div>
        <div style="text-align:right;font-size:11px">
          <strong>Misha Infotech Private Limited, India</strong><br/>
          Generated: ${new Date().toLocaleString()}
        </div>
      </div>
      <p><strong>Insured Person:</strong> ${persona?.displayName ?? '—'}<br/>
         <strong>SSN:</strong> ${persona?.personSsn ?? '—'}</p>
      ${printRef.current.innerHTML}
      <div class="footer">This document is system-generated. For official certification contact your branch office.</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Contribution Statements</CardTitle>
              <CardDescription>Annual contribution summary, printable as PDF.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={printStatement}>
                <Printer className="h-3 w-3 mr-1" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={printStatement}>
                <Download className="h-3 w-3 mr-1" /> Save as PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div ref={printRef}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Weeks paid</TableHead>
                    <TableHead>Insurable wages</TableHead>
                    <TableHead>Contributions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No contribution records.</TableCell></TableRow>
                  ) : rows.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{r.year_paid}</TableCell>
                      <TableCell>{r.weeks_paid ?? '—'}</TableCell>
                      <TableCell>{r.wages_paid ?? '—'}</TableCell>
                      <TableCell>{r.contributions_paid ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
