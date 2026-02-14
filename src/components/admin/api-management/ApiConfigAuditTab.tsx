import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  metadata: Record<string, any> | null;
}

const ApiConfigAuditTab: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_config_audit_logs' as any)
      .select('*')
      .gte('changed_at', `${dateFrom}T00:00:00`)
      .lte('changed_at', `${dateTo}T23:59:59`)
      .order('changed_at', { ascending: false })
      .limit(200);

    if (error) {
      toast.error('Failed to load audit logs');
    } else {
      setEntries((data || []) as unknown as AuditEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [dateFrom, dateTo]);

  const actionBadge = (action: string) => {
    switch (action) {
      case 'toggle': return <Badge variant="secondary">Toggle</Badge>;
      case 'update': return <Badge variant="default">Update</Badge>;
      case 'create': return <Badge variant="outline">Create</Badge>;
      case 'delete': return <Badge variant="destructive">Delete</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="icon" onClick={fetchEntries}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>API Configuration Change Log</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No configuration changes recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                    <TableCell><Badge variant="outline">{entry.entity_type}</Badge></TableCell>
                    <TableCell>{actionBadge(entry.action)}</TableCell>
                    <TableCell className="text-xs">{entry.field_name || '-'}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{entry.old_value || '-'}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{entry.new_value || '-'}</TableCell>
                    <TableCell className="text-xs">{entry.changed_by || '-'}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {entry.metadata ? JSON.stringify(entry.metadata) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiConfigAuditTab;
