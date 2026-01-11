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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  override?: any;
  userId: string;
}

export function UserOverrideDialog({ open, onOpenChange, override, userId }: Props) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      module_id: '',
      target_table: '',
      override_type: 'row_allow',
      field_name: '',
      condition_sql: '',
      reason: '',
      is_active: true,
      expires_at: ''
    }
  });

  const { data: modules } = useQuery({
    queryKey: ['modules-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('app_modules').select('id, display_name').eq('is_enabled', true);
      return data || [];
    }
  });

  useEffect(() => {
    if (override) {
      form.reset({
        module_id: override.module_id || '',
        target_table: override.target_table,
        override_type: override.override_type,
        field_name: override.field_name || '',
        condition_sql: override.condition_sql || '',
        reason: override.reason || '',
        is_active: override.is_active,
        expires_at: override.expires_at ? override.expires_at.split('T')[0] : ''
      });
    } else {
      form.reset({
        module_id: '', target_table: '', override_type: 'row_allow',
        field_name: '', condition_sql: '', reason: '', is_active: true, expires_at: ''
      });
    }
  }, [override, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        user_id: userId,
        module_id: data.module_id || null,
        field_name: data.field_name || null,
        expires_at: data.expires_at || null
      };
      if (override?.id) {
        const { error } = await supabase.from('user_data_overrides').update(payload).eq('id', override.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_data_overrides').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-overrides'] });
      toast.success(override ? 'Override updated' : 'Override created');
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const overrideType = form.watch('override_type');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{override ? 'Edit User Override' : 'Add User Override'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="override_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Override Type *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="row_allow">Row Allow (grant extra access)</SelectItem>
                    <SelectItem value="row_block">Row Block (deny access)</SelectItem>
                    <SelectItem value="field_allow">Field Allow (grant field access)</SelectItem>
                    <SelectItem value="field_block">Field Block (hide field)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
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
            {(overrideType === 'field_allow' || overrideType === 'field_block') && (
              <FormField control={form.control} name="field_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., salary" /></FormControl>
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="condition_sql" render={({ field }) => (
              <FormItem>
                <FormLabel>Condition SQL</FormLabel>
                <FormControl><Textarea {...field} rows={2} placeholder="Optional SQL condition" /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl><Input {...field} placeholder="Why this override?" /></FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="expires_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 pt-6">
                  <FormLabel>Active</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>
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
