import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { listRepeatDefaulters } from '@/services/riskProfileService';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';
import { AlertTriangle, ShieldOff, ShieldAlert, Eye, TrendingUp } from 'lucide-react';

const PERMISSION = 'manage_compliance';

export default function RepeatDefaultersPage() {
  if (!isComplianceFeatureEnabled('risk.repeatDefaulters')) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ShieldOff className="mx-auto h-8 w-8 mb-2" /> Repeat defaulter view is disabled.
        </CardContent></Card>
      </div>
    );
  }
  return <PermissionWrapper moduleName={PERMISSION}><Inner /></PermissionWrapper>;
}

function Inner() {
  const navigate = useNavigate();
  const [minMissed, setMinMissed] = useState(3);

  const { data = [], isLoading } = useQuery({
    queryKey: ['repeat-defaulters', minMissed],
    queryFn: () => listRepeatDefaulters(minMissed, 300),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          Repeat Defaulters
        </h1>
        <p className="text-sm text-muted-foreground">
          Employers with repeated missed filings and outstanding balances. Derived from filing-status and arrears views.
        </p>
      </div>

      {/* Peer navigation to sibling Risk & Employer Profile pages. */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/high-risk')}>
          <ShieldAlert className="h-4 w-4 mr-2" /> High Risk Employers
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/watchlist')}>
          <Eye className="h-4 w-4 mr-2" /> Watchlist
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/score-details')}>
          <TrendingUp className="h-4 w-4 mr-2" /> Score Details
        </Button>
      </div>


      <Card>
        <CardContent className="py-4 flex gap-3 items-end">
          <div className="w-48">
            <Label className="text-xs">Min missed filings (last 12m)</Label>
            <Input type="number" min={1} value={minMissed} onChange={(e) => setMinMissed(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <Badge variant="outline">{data.length} employer(s)</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaulter List</CardTitle>
          <CardDescription>Sorted by missed filings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer</TableHead>
                  <TableHead title="Missed periods / expected periods in the last 12 months (submitted in parentheses)">Missed / Expected</TableHead>
                  <TableHead>Last Filing Period</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Risk Band</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => {
                  // "Total Filings" from the view is the count actually submitted.
                  // Expected periods in the 12-month window = missed + submitted.
                  // Display missed / expected so the ratio is always coherent
                  // (previously showed e.g. "12 / 0", which is impossible).
                  const submitted = Number(r.total_filings_12m || 0);
                  const missed = Number(r.missed_filings_12m || 0);
                  const expected = missed + submitted;
                  return (
                  <TableRow key={r.employer_id}>
                    <TableCell>
                      <div>{r.employer_name || r.employer_id}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.employer_id}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-destructive">{missed}</span>
                      <span className="text-muted-foreground"> / {expected}</span>
                      <span className="text-xs text-muted-foreground ml-2">({submitted} submitted)</span>
                    </TableCell>
                    <TableCell className="text-xs">{r.last_filing_period || '—'}</TableCell>
                    <TableCell>${Number(r.total_outstanding).toLocaleString()}</TableCell>
                    <TableCell>{r.risk_band ? <Badge variant="outline">{r.risk_band}</Badge> : '—'}</TableCell>
                    <TableCell>{r.total_score != null ? Number(r.total_score).toFixed(1) : '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/risk/score-details?employer=${r.employer_id}`)}>
                        Risk Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {data.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No repeat defaulters at this threshold</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
