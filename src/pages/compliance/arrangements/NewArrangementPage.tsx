/**
 * New Arrangement — entry page that launches creation from a selected case.
 * Real creation requires a case context; this page lets users pick a case to start.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowRight, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

export default function NewArrangementPage() {
  const navigate = useNavigate();
  const enabled = isComplianceFeatureEnabled('arrangements.new');
  const [search, setSearch] = useState('');

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['ce_cases_for_new_arrangement', search],
    enabled,
    queryFn: async () => {
      let q = supabase.from('ce_cases')
        .select('id,case_number,employer_id,employer_name,total_amount,amount_collected,status')
        .not('status', 'in', '(RESOLVED,CLOSED,COMPLETED)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (search) q = q.or(`case_number.ilike.%${search}%,employer_id.ilike.%${search}%,employer_name.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title="New Payment Arrangement" subtitle="Pick a case to start a new arrangement. Outstanding balance is taken from the case." />
        {!enabled ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">New arrangements are disabled in feature toggles.</CardContent></Card>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search case, employer…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case #</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No eligible cases.</TableCell></TableRow>
                      )}
                      {cases.map((c: any) => {
                        const out = Number(c.total_amount || 0) - Number(c.amount_collected || 0);
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.case_number}</TableCell>
                            <TableCell>{c.employer_name || c.employer_id}</TableCell>
                            <TableCell className="text-right">{out.toLocaleString('en-US', { style: 'currency', currency: 'XCD' })}</TableCell>
                            <TableCell className="text-xs">{c.status}</TableCell>
                            <TableCell className="text-right">
                              <PermissionButton moduleName={MODULE} actionName="create" size="sm" variant="outline"
                                onClick={() => navigate(`/compliance/cases/${c.id}?action=new-arrangement`)}>
                                Start <ArrowRight className="h-4 w-4 ml-1" />
                              </PermissionButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionWrapper>
  );
}
