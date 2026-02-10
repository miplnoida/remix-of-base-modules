/**
 * IP Blocks Management Tab
 * Shows blocked IPs with ability to unblock.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logAuditTrail } from '@/services/auditService';

const PAGE_SIZE = 20;

const IPBlocksManagement: React.FC = () => {
  const { user, profile } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['ip-blocks', page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('security_ip_blocks')
        .select('*', { count: 'exact' })
        .order('blocked_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { blocks: data || [], count: count || 0 };
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (ipAddress: string) => {
      const { error } = await supabase
        .from('security_ip_blocks')
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
          unblocked_by: profile?.user_code || user?.id || 'admin',
        })
        .eq('ip_address', ipAddress)
        .eq('is_active', true);
      if (error) throw error;

      await logAuditTrail({
        action: 'ip_unblock',
        entityType: 'security_ip_blocks',
        entityId: ipAddress,
        module: 'Security',
        userCode: profile?.user_code || undefined,
        userId: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-blocks'] });
      toast.success('IP unblocked successfully');
    },
  });

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Blocked At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.blocks.map((block: any) => {
                  const isExpired = new Date(block.expires_at) < new Date();
                  const isActive = block.is_active && !isExpired;
                  return (
                    <TableRow key={block.id}>
                      <TableCell className="font-mono">{block.ip_address}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{block.block_reason}</TableCell>
                      <TableCell className="text-xs">{format(new Date(block.blocked_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                      <TableCell className="text-xs">{format(new Date(block.expires_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : block.unblocked_by ? (
                          <Badge variant="secondary">Unblocked</Badge>
                        ) : (
                          <Badge variant="outline">Expired</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unblockMutation.mutate(block.ip_address)}
                            disabled={unblockMutation.isPending}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unblock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!data?.blocks || data.blocks.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No IP blocks found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                {data?.count || 0} total records
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= (data?.count || 0)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default IPBlocksManagement;
