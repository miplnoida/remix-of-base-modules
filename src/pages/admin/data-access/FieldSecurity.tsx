import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Check, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { FieldSecurityDialog } from '@/components/data-access/FieldSecurityDialog';

export default function FieldSecurity() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['field-security-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_security_rules')
        .select(`*, module:app_modules(name, display_name), role:roles(role_name)`)
        .order('target_table', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('field_security_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-security-rules'] });
      toast.success('Rule deleted successfully');
    }
  });

  const getMaskingBadge = (type: string) => {
    switch (type) {
      case 'full': return <Badge variant="destructive">Full Mask</Badge>;
      case 'partial': return <Badge variant="secondary">Partial</Badge>;
      default: return <Badge variant="outline">None</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Field Security</h1>
          <p className="text-muted-foreground">Control field-level visibility and masking per role</p>
        </div>
        <Button onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Field Rules</CardTitle>
          <CardDescription>Define which fields each role can see or edit</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Can View</TableHead>
                  <TableHead>Can Edit</TableHead>
                  <TableHead>Masking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules?.map((rule: any) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.module?.display_name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{rule.target_table}</TableCell>
                    <TableCell className="font-mono text-sm">{rule.field_name}</TableCell>
                    <TableCell><Badge variant="outline">{rule.role?.role_name}</Badge></TableCell>
                    <TableCell>
                      {rule.can_view ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-red-600" />}
                    </TableCell>
                    <TableCell>
                      {rule.can_edit ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                    </TableCell>
                    <TableCell>{getMaskingBadge(rule.masking_type)}</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingRule(rule); setDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(rule.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!rules || rules.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No field rules defined yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FieldSecurityDialog open={dialogOpen} onOpenChange={setDialogOpen} rule={editingRule} />
    </div>
  );
}
