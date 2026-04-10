import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationType {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface NotificationTypeFormData {
  code: string;
  display_name: string;
  description: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const QUERY_KEY_ALL = ["notification-types"];
const QUERY_KEY_ACTIVE = ["notification-types", "active"];

/**
 * Fetch ALL notification types (for admin management screens).
 */
export function useNotificationTypes() {
  return useQuery({
    queryKey: QUERY_KEY_ALL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_types" as any)
        .select("*")
        .order("display_order", { ascending: true })
        .order("code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as NotificationType[];
    },
  });
}

/**
 * Fetch only ACTIVE notification types (for dropdowns / selectors).
 */
export function useActiveNotificationTypes() {
  return useQuery({
    queryKey: QUERY_KEY_ACTIVE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_types" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as NotificationType[];
    },
  });
}

/**
 * Create a new notification type.
 */
export function useCreateNotificationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: NotificationTypeFormData) => {
      const { error } = await supabase
        .from("notification_types" as any)
        .insert([{
          code: form.code.trim(),
          display_name: form.display_name.trim(),
          description: form.description?.trim() || null,
          icon: form.icon?.trim() || null,
          display_order: form.display_order,
          is_active: form.is_active,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ACTIVE });
      toast.success("Notification type created");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create notification type");
    },
  });
}

/**
 * Update an existing notification type.
 */
export function useUpdateNotificationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, form }: { id: string; form: NotificationTypeFormData }) => {
      const { error } = await supabase
        .from("notification_types" as any)
        .update({
          code: form.code.trim(),
          display_name: form.display_name.trim(),
          description: form.description?.trim() || null,
          icon: form.icon?.trim() || null,
          display_order: form.display_order,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ACTIVE });
      toast.success("Notification type updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update notification type");
    },
  });
}

/**
 * Toggle is_active flag on a notification type.
 */
export function useToggleNotificationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("notification_types" as any)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_ACTIVE });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to toggle notification type");
    },
  });
}
