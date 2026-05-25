/**
 * Notice Register — full list of all notices linked to cases/violations.
 * Read view; uses existing PermissionWrapper (view) and PermissionButton (create).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Plus, ExternalLink, Loader2, Search } from 'lucide-react';
import { fetchNotices } from '@/services/complianceDataService';
import { GenerateNoticeDialog } from '@/components/compliance/GenerateNoticeDialog';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

const STATUS_VARIANTS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-700 border-amber-300',
  APPROVED: 'bg-blue-500/15 text-blue-700 border-blue-300',
  SENT: 'bg-blue-600/15 text-blue-800 border-blue-400',
  DELIVERED: 'bg-green-500/15 text-green-700 border-green-300',
  ACKNOWLEDGED: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/30',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export default function NoticeRegister() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [openGen, setOpenGen] = useState(false);

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['ce_notices', 'register', search],
    queryFn: () => fetchNotices({ search: search || undefined }),
  });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title="Notice Register" subtitle="All compliance notices linked to cases and violations." />

        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search by notice no, employer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isComplianceFeatureEnabled('notices.generate') && (
            <PermissionButton moduleName={MODULE} actionName="create" onClick={() => setOpenGen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Generate Notice
            </PermissionButton>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notice #</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notices.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No notices found.</TableCell></TableRow>
                  )}
                  {notices.map((n: any) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.notice_number}</TableCell>
                      <TableCell>{n.employer_name || n.employer_id}</TableCell>
                      <TableCell>{n.notice_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_VARIANTS[n.status] || ''}>{n.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {n.case_id ? <button className="text-primary hover:underline mr-2" onClick={() => navigate(`/compliance/cases/${n.case_id}`)}>Case</button> : null}
                        {n.violation_id ? <button className="text-primary hover:underline" onClick={() => navigate(`/compliance/violations/${n.violation_id}`)}>Violation</button> : null}
                        {!n.case_id && !n.violation_id && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{n.created_at ? new Date(n.created_at).toLocaleDateString('en-GB') : '—'}</TableCell>
                      <TableCell>
                        <button onClick={() => navigate(`/compliance/enforcement/notices?notice=${n.id}`)} className="text-primary hover:underline inline-flex items-center text-xs">
                          Open <ExternalLink className="h-3 w-3 ml-1" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <GenerateNoticeDialog open={openGen} onOpenChange={setOpenGen} />
      </div>
    </PermissionWrapper>
  );
}
