import { ComplianceHelpButton } from '@/components/help/ComplianceHelpButton';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { listHighRiskEmployers } from '@/services/riskProfileService';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';
import { ShieldAlert, AlertTriangle, Eye, TrendingUp } from 'lucide-react';

const PERMISSION = 'manage_compliance';

export default function HighRiskEmployersPage() {
  // Sub-feature gate: mirror the sidebar menu, which hides this item when
  // `risk.highRiskEmployers` is off. Without this, the page was reachable by
  // direct URL even though no navigation surface existed.
  if (!isComplianceFeatureEnabled('risk.highRiskEmployers')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <PermissionWrapper moduleName={PERMISSION}><Inner /></PermissionWrapper>;
}


function Inner() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ['high-risk-employers'],
    queryFn: () => listHighRiskEmployers(300),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" /> High Risk Employers
          </h1>
          <p className="text-sm text-muted-foreground">
            Employers in the High or Critical risk band — sorted by score.
          </p>
        </div>
        <ComplianceHelpButton screenKey="risk-high-risk-employers" />
      </div>

      {/* Peer navigation: sibling Risk & Employer Profile pages, so users can
          reach Repeat Defaulters / Watchlist / Score Details without hunting
          through the sidebar. */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/repeat-defaulters')}>
          <AlertTriangle className="h-4 w-4 mr-2" /> Repeat Defaulters
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/watchlist')}>
          <Eye className="h-4 w-4 mr-2" /> Watchlist
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/compliance/risk/score-details')}>
          <TrendingUp className="h-4 w-4 mr-2" /> Score Details
        </Button>

      <Card>
        <CardHeader>
          <CardTitle>{data.length} employer(s)</CardTitle>
          <CardDescription>From ce_risk_profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Last Calculated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => {
                  const effectiveBand = r.override_band || r.risk_band;
                  return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>{r.employer_name || r.employer_id}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.employer_id}</div>
                    </TableCell>
                    <TableCell className="font-semibold">{Number(r.total_score).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="destructive">{effectiveBand}</Badge></TableCell>
                    <TableCell>{r.override_band ? <Badge variant="outline">{r.override_band}</Badge> : '—'}</TableCell>
                    <TableCell className="text-xs">{r.last_calculated_at?.slice(0, 10) || '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/risk/score-details?employer=${r.employer_id}`)}>
                        Score Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {data.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No high-risk employers</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
