import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: any;
}

export function DataScopeRuleDialog({ open, onOpenChange, rule }: Props) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      module_id: '',
      target_table: '',
      role_id: '',
      condition_type: 'owner',
      condition_value: '',
      custom_sql: '',
      can_view: true,
      can_edit: false,
      can_delete: false,
      is_active: true,
      priority: 100,
      description: ''
    }
  });

  const { data: modules } = useQuery({
    queryKey: ['modules-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('app_modules').select('id, display_name').eq('is_enabled', true);
      return data || [];
    }
  });

  const { data: roles } = useQuery({
    queryKey: ['roles-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, role_name').eq('is_active', true);
      return data || [];
    }
  });

  useEffect(() => {
    if (rule) {
      form.reset({
        module_id: rule.module_id || '',
        target_table: rule.target_table,
        role_id: rule.role_id,
        condition_type: rule.condition_type,
        condition_value: rule.condition_value || '',
        custom_sql: rule.custom_sql || '',
        can_view: rule.can_view,
        can_edit: rule.can_edit,
        can_delete: rule.can_delete,
        is_active: rule.is_active,
        priority: rule.priority,
        description: rule.description || ''
      });
    } else {
      form.reset({
        module_id: '', target_table: '', role_id: '', condition_type: 'owner',
        condition_value: '', custom_sql: '', can_view: true, can_edit: false,
        can_delete: false, is_active: true, priority: 100, description: ''
      });
    }
  }, [rule, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, module_id: data.module_id || null };
      if (rule?.id) {
        const { error } = await supabase.from('data_scope_rules').update(payload).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('data_scope_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-scope-rules'] });
      toast.success(rule ? 'Rule updated' : 'Rule created');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Data Scope Rule' : 'Add Data Scope Rule'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="module_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {modules?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="target_table" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Table *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., invoices" /></FormControl>
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
                </FormItem>
              )} />
              <FormField control={form.control} name="condition_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="created_by">Created By</SelectItem>
                      <SelectItem value="custom_sql">Custom SQL</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="condition_value" render={({ field }) => (
              <FormItem>
                <FormLabel>Condition Value</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., user.department_id" /></FormControl>
              </FormItem>
            )} />
            {form.watch('condition_type') === 'custom_sql' && (
              <FormField control={form.control} name="custom_sql" render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom SQL</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="WHERE clause..." /></FormControl>
                </FormItem>
              )} />
            )}
            <div className="grid grid-cols-4 gap-4">
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
              <FormField control={form.control} name="can_delete" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Can Delete</FormLabel>
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
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} rows={2} /></FormControl>
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
