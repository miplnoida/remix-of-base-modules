import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Shield, Lock } from 'lucide-react';

export default function RoleDataPolicies() {
  const [selectedRole, setSelectedRole] = useState<string>('');

  const { data: roles } = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: scopeRules } = useQuery({
    queryKey: ['scope-rules-by-role', selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      const { data, error } = await supabase
        .from('data_scope_rules')
        .select(`*, module:app_modules(display_name)`)
        .eq('role_id', selectedRole);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRole
  });

  const { data: fieldRules } = useQuery({
    queryKey: ['field-rules-by-role', selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      const { data, error } = await supabase
        .from('field_security_rules')
        .select(`*, module:app_modules(display_name)`)
        .eq('role_id', selectedRole);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRole
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role Data Policies</h1>
        <p className="text-muted-foreground">View all data access policies applied to each role</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Role</CardTitle>
          <CardDescription>Choose a role to view its complete data access policies</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((role: any) => (
                <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedRole && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Row-Level Access Rules
              </CardTitle>
              <CardDescription>{scopeRules?.length || 0} rules defined</CardDescription>
            </CardHeader>
            <CardContent>
              {scopeRules?.length === 0 ? (
                <p className="text-muted-foreground">No row-level rules for this role.</p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {scopeRules?.map((rule: any) => (
                    <AccordionItem key={rule.id} value={rule.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-4">
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span>{rule.module?.display_name} - {rule.target_table}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded">
                          <div><strong>Condition:</strong> {rule.condition_type}</div>
                          <div><strong>Value:</strong> {rule.condition_value || 'N/A'}</div>
                          <div className="flex items-center gap-2">
                            <strong>View:</strong> {rule.can_view ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <strong>Edit:</strong> {rule.can_edit ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <strong>Delete:</strong> {rule.can_delete ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                          </div>
                          <div><strong>Priority:</strong> {rule.priority}</div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Field-Level Security Rules
              </CardTitle>
              <CardDescription>{fieldRules?.length || 0} rules defined</CardDescription>
            </CardHeader>
            <CardContent>
              {fieldRules?.length === 0 ? (
                <p className="text-muted-foreground">No field-level rules for this role.</p>
              ) : (
                <div className="space-y-2">
                  {fieldRules?.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-4">
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="font-mono text-sm">{rule.target_table}.{rule.field_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">View: {rule.can_view ? '✓' : '✗'}</span>
                        <span className="text-sm">Edit: {rule.can_edit ? '✓' : '✗'}</span>
                        <Badge variant={rule.masking_type === 'full' ? 'destructive' : rule.masking_type === 'partial' ? 'secondary' : 'outline'}>
                          {rule.masking_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
