import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

// Types
export type AppRole = Database['public']['Enums']['app_role'];

export interface OfficeLocation {
  id: string;
  branch_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  departments?: Department[];
}

export interface Department {
  id: string;
  office_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  department_head_user_id?: string | null;
}

export interface AppModule {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  parent_id: string | null;
  sort_order: number;
  is_enabled: boolean;
  actions?: ModuleAction[];
}

export interface ModuleAction {
  id: string;
  module_id: string;
  action_name: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
}

// Partial types for nested selects
interface OfficePartial {
  id: string;
  branch_name: string;
}

interface DepartmentPartial {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  middle_name: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  employee_code: string | null;
  office_id: string | null;
  department_id: string | null;
  is_active: boolean | null;
  force_password_change: boolean | null;
  last_login: string | null;
  mfa_enabled: boolean | null;
  failed_login_attempts: number | null;
  locked_until: string | null;
  office?: OfficePartial | null;
  department?: DepartmentPartial | null;
  roles?: { role: AppRole }[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action_type: string;
  module_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  subject: string | null;
  title: string | null;
  body: string;
  placeholders: Record<string, string> | null;
  is_enabled: boolean;
  module_id: string | null;
  module?: { id: string; display_name: string } | null;
}

export interface NotificationLog {
  id: string;
  template_id: string | null;
  channel: string;
  recipient_user_id: string | null;
  recipient_address: string;
  subject: string | null;
  title: string | null;
  body: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
  failure_reason: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface PasswordPolicy {
  id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  max_age_days: number;
  prevent_reuse_count: number;
  lockout_threshold: number;
  lockout_duration_minutes: number;
  session_timeout_minutes: number;
  idle_timeout_minutes: number;
  max_concurrent_sessions: number;
  is_active: boolean;
}

// Office Locations
export function useOfficeLocations() {
  return useQuery({
    queryKey: ['office-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('office_locations')
        .select(`
          *,
          departments(
            id,
            office_id,
            name,
            description,
            is_active,
            department_head_user_id,
            created_at,
            updated_at
          )
        `)
        .order('branch_name');
      if (error) {
        console.error('Error fetching office locations:', error);
        throw error;
      }
      return (data || []) as OfficeLocation[];
    },
  });
}

export function useCreateOfficeLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { branch_name: string; address?: string; city?: string; state?: string; country?: string; is_active?: boolean }) => {
      const { data: result, error } = await supabase
        .from('office_locations')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
      toast.success('Office location created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateOfficeLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<OfficeLocation> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('office_locations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
      toast.success('Office location updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Departments
export function useDepartments(officeId?: string | null) {
  return useQuery({
    queryKey: ['departments', officeId],
    queryFn: async () => {
      let query = supabase.from('departments').select('*').order('name');
      if (officeId) query = query.eq('office_id', officeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Department[];
    },
    // Only fetch when officeId is provided and not empty, or when explicitly undefined (fetch all)
    enabled: officeId === undefined || (typeof officeId === 'string' && officeId.length > 0),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { office_id: string; name: string; description?: string; is_active?: boolean; department_head_user_id?: string | null }) => {
      const { data: result, error } = await supabase
        .from('departments')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
      toast.success('Department created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_active?: boolean; department_head_user_id?: string | null }) => {
      const { data: result, error } = await supabase
        .from('departments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
      toast.success('Department updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
      toast.success('Department deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useAppModules() {
  return useQuery({
    queryKey: ['app-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('*, module_actions(*)')
        .order('sort_order');
      if (error) throw error;
      // Map module_actions to actions property expected by components
      return (data || []).map(module => ({
        ...module,
        actions: module.module_actions || [],
      })) as AppModule[];
    },
  });
}

export function useCreateAppModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; display_name: string; description?: string; icon?: string; route?: string; parent_id?: string | null; sort_order?: number; is_enabled?: boolean }) => {
      // Create the module
      const { data: result, error } = await supabase
        .from('app_modules')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      
      // Auto-create default "View" action for the new module
      if (result) {
        const { error: actionError } = await supabase
          .from('module_actions')
          .insert({
            module_id: result.id,
            action_name: 'view',
            display_name: 'View',
            description: 'Permission to view this module',
            is_enabled: true,
          });
        if (actionError) {
          console.error('Failed to create default View action:', actionError);
          // Don't fail the whole operation, just log the error
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-modules'] });
      toast.success('Module created successfully with default View action');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateAppModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AppModule> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('app_modules')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-modules'] });
      toast.success('Module updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteAppModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_modules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-modules'] });
      toast.success('Module deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Module Actions
export function useCreateModuleAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { module_id: string; action_name: string; display_name: string; description?: string; is_enabled?: boolean }) => {
      const { data: result, error } = await supabase
        .from('module_actions')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-modules'] });
      toast.success('Action created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateModuleAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ModuleAction> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('module_actions')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-modules'] });
      toast.success('Action updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteModuleAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('module_actions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-modules'] });
      toast.success('Action deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// User Profiles
export function useUserProfiles() {
  return useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          first_name,
          last_name,
          middle_name,
          email,
          title,
          phone,
          gender,
          date_of_birth,
          employee_code,
          office_id,
          department_id,
          is_active,
          force_password_change,
          last_login,
          mfa_enabled,
          failed_login_attempts,
          locked_until,
          office:office_locations(id, branch_name),
          department:departments!profiles_department_id_fkey(id, name)
        `)
        .order('full_name');
      if (error) {
        console.error('Error fetching user profiles:', error);
        throw error;
      }
      return (data || []) as UserProfile[];
    },
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          office:office_locations(id, branch_name),
          department:departments!profiles_department_id_fkey(id, name)
        `)
        .eq('id', userId)
        .single();
      if (profileError) throw profileError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (rolesError) throw rolesError;

      return { ...profile, roles } as UserProfile;
    },
    enabled: !!userId,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<UserProfile> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profiles'] });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// User Roles
export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      toast.success('Role assigned successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Audit Logs
export function useAuditLogs(filters?: { actionType?: string; module?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.actionType) query = query.eq('action_type', filters.actionType);
      if (filters?.module) query = query.eq('module_name', filters.module);
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

// Notification Templates
export function useNotificationTemplates() {
  return useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*, module:app_modules(id, display_name)')
        .order('name');
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });
}

export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; channel: 'email' | 'sms' | 'push' | 'in_app'; body: string; subject?: string; title?: string; is_enabled?: boolean; module_id?: string | null }) => {
      const { data: result, error } = await supabase
        .from('notification_templates')
        .insert(data)
        .select('*, module:app_modules(id, display_name)')
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<NotificationTemplate> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('notification_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Notification Logs
export function useNotificationLogs(filters?: { channel?: 'email' | 'sms' | 'push' | 'in_app'; status?: 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled' }) {
  return useQuery({
    queryKey: ['notification-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.channel) query = query.eq('channel', filters.channel);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationLog[];
    },
  });
}

export function useResendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notification_logs')
        .update({ status: 'queued' })
        .eq('id', notificationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      toast.success('Notification queued for resend');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useCancelNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notification_logs')
        .update({ status: 'cancelled' })
        .eq('id', notificationId)
        .eq('status', 'queued')
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      toast.success('Notification cancelled');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Password Policy
export function usePasswordPolicy() {
  return useQuery({
    queryKey: ['password-policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_policies')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data as PasswordPolicy;
    },
  });
}

export function useUpdatePasswordPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PasswordPolicy> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('password_policies')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-policy'] });
      toast.success('Password policy updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// In-App Notifications
export function useInAppNotifications() {
  return useQuery({
    queryKey: ['in-app-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
    },
  });
}
