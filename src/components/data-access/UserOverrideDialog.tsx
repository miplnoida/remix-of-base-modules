import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ModuleTreeSelector } from './ModuleTreeSelector';
import { useModuleTables, useTableColumns } from '@/hooks/useModuleTables';

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

  const moduleId = form.watch('module_id');
  const targetTable = form.watch('target_table');
  const overrideType = form.watch('override_type');

  const { data: tables, isLoading: tablesLoading } = useModuleTables(moduleId);
  const { data: columns, isLoading: columnsLoading } = useTableColumns(targetTable);

  // Reset target_table when module changes
  useEffect(() => {
    if (moduleId && !override) {
      form.setValue('target_table', '');
      form.setValue('field_name', '');
    }
  }, [moduleId, form, override]);

  // Reset field_name when target_table changes
  useEffect(() => {
    if (targetTable && !override) {
      form.setValue('field_name', '');
    }
  }, [targetTable, form, override]);

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
  }, [override, form, open]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Validation
      if (!data.module_id) {
        throw new Error('Please select a module');
      }
      if (!data.target_table) {
        throw new Error('Please select a target table');
      }
      if ((data.override_type === 'field_allow' || data.override_type === 'field_block') && !data.field_name) {
        throw new Error('Please select a field for field-level overrides');
      }
      
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

  const isFieldOverride = overrideType === 'field_allow' || overrideType === 'field_block';

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
                <FormMessage />
              </FormItem>
            )} />

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
                <FormLabel>Target Table *</FormLabel>
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

            {isFieldOverride && (
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
            )}

            <FormField control={form.control} name="condition_sql" render={({ field }) => (
              <FormItem>
                <FormLabel>Condition SQL</FormLabel>
                <FormControl><Textarea {...field} rows={2} placeholder="Optional SQL condition" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl><Input {...field} placeholder="Why this override?" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="expires_at" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
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