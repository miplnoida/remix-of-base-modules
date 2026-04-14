import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Building2, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Employer360Search() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchTrigger, setSearchTrigger] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['employer360_search', searchTrigger],
    queryFn: async () => {
      if (!searchTrigger || searchTrigger.length < 2) return [];
      const term = `%${searchTrigger}%`;
      const { data, error } = await supabase
        .from('er_master')
        .select('regno, name, status, office_code, village_code, registration_date, trade_name')
        .or(`regno.ilike.${term},name.ilike.${term},trade_name.ilike.${term}`)
        .order('name')
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: searchTrigger.length >= 2,
  });

  const handleSearch = () => setSearchTrigger(search.trim());
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const statusLabel = (s: string | null) => {
    const map: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
      A: { label: 'Active', variant: 'default' },
      V: { label: 'Verified', variant: 'default' },
      P: { label: 'Pending', variant: 'secondary' },
      C: { label: 'Ceased', variant: 'destructive' },
      S: { label: 'Suspended', variant: 'destructive' },
    };
    return map[s || ''] || { label: s || '—', variant: 'outline' as const };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Employer 360°"
        subtitle="Search and view comprehensive employer profiles"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Employer 360°' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Search Employers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by registration number, employer name, or trade name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={search.trim().length < 2}>
              <Search className="h-4 w-4 mr-2" />Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}

      {!isLoading && searchTrigger && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No employers found</p>
            <p className="text-sm">Try a different search term</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg. No.</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Trade Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((emp: any) => {
                  const st = statusLabel(emp.status);
                  return (
                    <TableRow key={emp.regno} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/compliance/field/employer-360/${emp.regno}`)}>
                      <TableCell className="font-mono font-medium">{emp.regno}</TableCell>
                      <TableCell className="font-medium">{emp.name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.trade_name || '—'}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-sm">{emp.office_code || '—'}</TableCell>
                      <TableCell className="text-sm">{emp.registration_date ? new Date(emp.registration_date).toLocaleDateString('en-GB') : '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
