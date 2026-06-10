import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { useMedicalProcedures } from '@/hooks/bn/useBnMedical';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Read-only roll-up of where medical review (specialist report / board approval / pre-authorization)
 * is required. Editing happens via Procedures Catalog (per-procedure flags) or Referral Rules
 * (per procedure × country flags). This page is the single overview admins use to verify coverage.
 */
export default function MedicalReviewRulesPage() {
  const { data: procedures = [] } = useMedicalProcedures();

  const rows = useMemo(
    () => procedures.map((p: any) => ({
      id: p.id, code: p.procedure_code, name: p.procedure_name, country: p.country_code,
      preAuth: !!p.requires_pre_authorization, board: !!p.requires_medical_board, active: !!p.is_active,
    })),
    [procedures]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Medical Review Rules</h1>
          <p className="text-sm text-muted-foreground">Roll-up of pre-authorization and medical board requirements per procedure.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-Procedure Review Coverage</CardTitle>
          <CardDescription>
            Edit individual flags in <Link className="underline" to="/bn/config/medical/procedures">Procedures Catalog</Link> or
            jurisdictional escalation in <Link className="underline" to="/bn/config/medical/referral-rules">Referral Rules</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="text-muted-foreground py-6 text-center">No procedures configured yet.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Procedure</TableHead><TableHead>Country</TableHead>
                <TableHead>Pre-Auth</TableHead><TableHead>Medical Board</TableHead><TableHead>Active</TableHead><TableHead className="w-32">Edit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.country}</TableCell>
                    <TableCell>{r.preAuth ? <Badge>Required</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>{r.board ? <Badge>Required</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>{r.active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell><Button asChild variant="ghost" size="sm"><Link to="/bn/config/medical/procedures">Open</Link></Button></TableCell>
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
