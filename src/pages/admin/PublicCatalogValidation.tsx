import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Issue = {
  product_id: string;
  benefit_code: string;
  benefit_name: string;
  issue_code: string;
  issue_message: string;
};

export default function PublicCatalogValidation() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-catalog-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_bn_product_public_config_issues' as any)
        .select('*');
      if (error) throw error;
      return ((data ?? []) as unknown) as Issue[];
    },
  });

  const grouped = (data ?? []).reduce<Record<string, Issue[]>>((acc, i) => {
    (acc[i.benefit_code] ??= []).push(i);
    return acc;
  }, {});
  const codes = Object.keys(grouped);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Public Catalog — Configuration Validation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Issues reported by <code>v_bn_product_public_config_issues</code>. Products with no issues are ready to be exposed on the Claimant Portal.
        </p>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : codes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            All public products pass validation.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {data!.length} issue{data!.length === 1 ? '' : 's'} across {codes.length} product{codes.length === 1 ? '' : 's'}
            </CardTitle>
            <CardDescription>Fix these in BN → Product Catalog before enabling on the public channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((i, idx) => (
                  <TableRow key={`${i.product_id}-${i.issue_code}-${idx}`}>
                    <TableCell>
                      <div className="font-medium">{i.benefit_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{i.benefit_code}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{i.issue_code}</Badge></TableCell>
                    <TableCell className="text-sm">{i.issue_message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
