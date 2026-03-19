import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserOverrideDialog } from '@/components/data-access/UserOverrideDialog';

export default function UserDataOverrides() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ['users-with-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: overrides, isLoading } = useQuery({
    queryKey: ['user-overrides', selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data, error } = await supabase
        .from('user_data_overrides')
        .select(`*, module:app_modules(display_name)`)
        .eq('user_id', selectedUser);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_data_overrides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-overrides'] });
      toast.success('Override deleted');
    }
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'row_allow': return <Badge className="bg-green-600">Row Allow</Badge>;
      case 'row_block': return <Badge variant="destructive">Row Block</Badge>;
      case 'field_allow': return <Badge className="bg-blue-600">Field Allow</Badge>;
      case 'field_block': return <Badge variant="secondary">Field Block</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Data Overrides</h1>
          <p className="text-muted-foreground">Configure user-specific exceptions to role policies</p>
        </div>
        {selectedUser && (
          <Button onClick={() => { setEditingOverride(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Override
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
          <CardDescription>Choose a user to view or add overrides</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-full max-w-[400px]">
              <SelectValue placeholder="Select a user..." />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>User Overrides</CardTitle>
            <CardDescription>These overrides take precedence over role-based policies</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides?.map((override: any) => (
                    <TableRow key={override.id}>
                      <TableCell>{getTypeBadge(override.override_type)}</TableCell>
                      <TableCell>{override.module?.display_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{override.target_table}</TableCell>
                      <TableCell className="font-mono text-sm">{override.field_name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{override.reason || '-'}</TableCell>
                      <TableCell>
                        {override.expires_at ? new Date(override.expires_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={override.is_active ? "default" : "secondary"}>
                          {override.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingOverride(override); setDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(override.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!overrides || overrides.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No overrides for this user.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <UserOverrideDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        override={editingOverride}
        userId={selectedUser}
      />
    </div>
  );
}
