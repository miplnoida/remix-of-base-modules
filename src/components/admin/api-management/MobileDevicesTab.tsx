import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DeviceRow {
  id: string;
  user_code: string;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  app_version: string | null;
  is_active: boolean;
  registered_at: string;
  last_seen_at: string | null;
  last_ip: string | null;
  revoked_at: string | null;
}

const MobileDevicesTab: React.FC = () => {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ce_mobile_devices' as any)
      .select('*')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) toast.error('Failed to load devices');
    else setDevices((data || []) as unknown as DeviceRow[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const revoke = async (d: DeviceRow) => {
    const { error } = await supabase
      .from('ce_mobile_devices' as any)
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: 'admin_revoked',
      } as any)
      .eq('id', d.id);
    if (error) toast.error('Failed to revoke');
    else {
      toast.success(`Device ${d.device_name || d.device_id} revoked`);
      fetch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registered Mobile Devices</CardTitle>
          <Button variant="outline" size="icon" onClick={fetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : devices.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No mobile devices registered yet. Devices appear here after officers log in from the mobile app.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Officer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>App Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Last IP</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id} className={!d.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{d.user_code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{d.device_name || '—'}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{d.device_id}</div>
                  </TableCell>
                  <TableCell>{d.platform || '—'}</TableCell>
                  <TableCell>{d.app_version || '—'}</TableCell>
                  <TableCell>
                    {d.is_active
                      ? <Badge variant="default">Active</Badge>
                      : <Badge variant="destructive">Revoked</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{d.registered_at ? format(new Date(d.registered_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                  <TableCell className="text-xs">{d.last_seen_at ? format(new Date(d.last_seen_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                  <TableCell className="text-xs">{d.last_ip || '—'}</TableCell>
                  <TableCell>
                    {d.is_active && (
                      <Button size="icon" variant="ghost" onClick={() => revoke(d)} title="Revoke device" className="text-destructive">
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileDevicesTab;
