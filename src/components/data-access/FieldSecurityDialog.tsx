import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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
  }, [rule, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
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
                <FormLabel>Table *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., employees" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="field_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Field Name *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., salary" /></FormControl>
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
