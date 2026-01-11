import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ModuleTreeSelector } from './ModuleTreeSelector';
import { useModuleTables, useTableColumns } from '@/hooks/useModuleTables';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: any;
}

export function FieldSecurityDialog({ open, onOpenChange, rule }: Props) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      module_id: '',
      target_table: '',
      field_name: '',
      role_id: '',
      can_view: true,
      can_edit: false,
      masking_type: 'none',
      is_active: true,
      priority: 100
    }
  });

  const moduleId = form.watch('module_id');
  const targetTable = form.watch('target_table');

  const { data: tables, isLoading: tablesLoading } = useModuleTables(moduleId);
  const { data: columns, isLoading: columnsLoading } = useTableColumns(targetTable);

  const { data: roles } = useQuery({
    queryKey: ['roles-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, role_name').eq('is_active', true);
      return data || [];
    }
  });

  // Reset target_table when module changes
  useEffect(() => {
    if (moduleId && !rule) {
      form.setValue('target_table', '');
      form.setValue('field_name', '');
    }
  }, [moduleId, form, rule]);

  // Reset field_name when target_table changes
  useEffect(() => {
    if (targetTable && !rule) {
      form.setValue('field_name', '');
    }
  }, [targetTable, form, rule]);

  useEffect(() => {
    if (rule) {
      form.reset({
        module_id: rule.module_id || '',
        target_table: rule.target_table,
        field_name: rule.field_name,
        role_id: rule.role_id,
        can_view: rule.can_view,
        can_edit: rule.can_edit,
        masking_type: rule.masking_type,
        is_active: rule.is_active,
        priority: rule.priority
      });
    } else {
      form.reset({
        module_id: '', target_table: '', field_name: '', role_id: '',
        can_view: true, can_edit: false, masking_type: 'none', is_active: true, priority: 100
      });
    }
  }, [rule, form, open]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Validation
      if (!data.module_id) {
        throw new Error('Please select a module');
      }
      if (!data.target_table) {
        throw new Error('Please select a table');
      }
      if (!data.field_name) {
        throw new Error('Please select a field');
      }
      if (!data.role_id) {
        throw new Error('Please select a role');
      }
      
      const payload = { ...data, module_id: data.module_id || null };
      if (rule?.id) {
        const { error } = await supabase.from('field_security_rules').update(payload).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('field_security_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-security-rules'] });
      toast.success(rule ? 'Rule updated' : 'Rule created');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Field Security Rule' : 'Add Field Security Rule'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="module_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Module *</FormLabel>
                <FormControl>
                  <ModuleTreeSelector 
                    value={field.value} 
                    onChange={field.onChange}
                    placeholder="Select leaf module..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="target_table" render={({ field }) => (
              <FormItem>
                <FormLabel>Table *</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={!moduleId || tablesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={tablesLoading ? "Loading..." : "Select table..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tables?.map((t) => (
                      <SelectItem key={t.table_name} value={t.table_name}>
                        {t.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="field_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Field Name *</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={!targetTable || columnsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={columnsLoading ? "Loading..." : "Select field..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {columns?.map((c) => (
                      <SelectItem key={c.column_name} value={c.column_name}>
                        {c.column_name} ({c.data_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="role_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Role *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {roles?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="can_view" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Can View</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="can_edit" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Can Edit</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Active</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="masking_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Masking Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="partial">Partial (e.g., ***1234)</SelectItem>
                    <SelectItem value="full">Full (e.g., ****)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}