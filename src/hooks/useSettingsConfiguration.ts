import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSiteSettings,
  saveSiteSetting,
  fetchEmailConfig,
  saveEmailConfig,
  publishAll,
  retrySync,
} from "@/services/wizSettingsService";
import { toast } from "sonner";

export function useSiteSettings(settingType?: string) {
  return useQuery({
    queryKey: ["c3-site-settings", settingType],
    queryFn: () => fetchSiteSettings(settingType),
  });
}

export function useEmailConfig(configGroup?: string) {
  return useQuery({
    queryKey: ["c3-email-config", configGroup],
    queryFn: () => fetchEmailConfig(configGroup),
  });
}

export function usePendingCount() {
  const { data: allSettings } = useSiteSettings();
  const { data: allEmails } = useEmailConfig();

  const settingsPending = allSettings?.filter((s) => !s.is_synced).length || 0;
  const emailPending = allEmails?.filter((e) => !e.is_synced).length || 0;
  return settingsPending + emailPending;
}

export function useSaveSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
      userCode,
    }: {
      id: string;
      updates: { setting_value?: string; description?: string; environment?: string; is_active?: boolean };
      userCode: string;
    }) => saveSiteSetting(id, updates, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c3-site-settings"] });
      toast.success("Setting saved locally");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSaveEmailConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { config_value?: string; description?: string; is_active?: boolean };
    }) => saveEmailConfig(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c3-email-config"] });
      toast.success("Email config saved locally");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePublishAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishAll,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["c3-site-settings"] });
      qc.invalidateQueries({ queryKey: ["c3-email-config"] });
      const ss = data?.data?.site_settings;
      const em = data?.data?.email_config;
      const totalSynced = (ss?.synced || 0) + (em?.synced || 0);
      const totalFailed = (ss?.failed || 0) + (em?.failed || 0);
      if (totalFailed > 0) {
        toast.warning(`Published ${totalSynced} settings, ${totalFailed} failed`);
      } else if (totalSynced > 0) {
        toast.success(`Successfully published ${totalSynced} settings`);
      } else {
        toast.info("No pending changes to publish");
      }
    },
    onError: (err: Error) => toast.error(`Publish failed: ${err.message}`),
  });
}

export function useRetrySync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ table, id }: { table: "setting" | "email"; id: string }) =>
      retrySync(table, id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["c3-site-settings"] });
      qc.invalidateQueries({ queryKey: ["c3-email-config"] });
      if (data?.data?.synced) {
        toast.success("Retry successful");
      } else {
        toast.error(`Retry failed: ${data?.data?.error || "Unknown error"}`);
      }
    },
    onError: (err: Error) => toast.error(`Retry failed: ${err.message}`),
  });
}
