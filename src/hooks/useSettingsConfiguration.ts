import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSiteSettings,
  saveSiteSetting,
  fetchEmailConfig,
  saveEmailConfig,
  fetchEmailTemplates,
  saveEmailTemplate,
  createEmailTemplate,
  softDeleteEmailTemplate,
  toggleEmailTemplateActive,
  publishAll,
  retrySync,
  type EmailTemplateUpdate,
  type EmailTemplateCreate,
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

export function useEmailTemplates(fromModule?: string) {
  return useQuery({
    queryKey: ["c3-email-templates", fromModule],
    queryFn: () => fetchEmailTemplates(fromModule),
  });
}

export function usePendingCount() {
  const { data: allSettings } = useSiteSettings();
  const { data: allEmails } = useEmailConfig();
  const { data: allTemplates } = useEmailTemplates();

  const settingsPending = allSettings?.filter((s) => !s.is_synced).length || 0;
  const emailPending = allEmails?.filter((e) => !e.is_synced).length || 0;
  const templatesPending = allTemplates?.filter((t) => !t.is_synced).length || 0;
  return settingsPending + emailPending + templatesPending;
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

export function useSaveEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
      userCode,
    }: {
      id: string;
      updates: EmailTemplateUpdate;
      userCode: string;
    }) => saveEmailTemplate(id, updates, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c3-email-templates"] });
      toast.success("Template saved locally — publish to push live");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, userCode }: { payload: EmailTemplateCreate; userCode: string }) =>
      createEmailTemplate(payload, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c3-email-templates"] });
      toast.success("Template created — publish to push live");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userCode }: { id: string; userCode: string }) =>
      softDeleteEmailTemplate(id, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c3-email-templates"] });
      toast.success("Template removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useToggleEmailTemplateActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isActive,
      userCode,
    }: {
      id: string;
      isActive: boolean;
      userCode: string;
    }) => toggleEmailTemplateActive(id, isActive, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c3-email-templates"] });
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
      qc.invalidateQueries({ queryKey: ["c3-email-templates"] });
      const ss = data?.data?.site_settings;
      const em = data?.data?.email_config;
      const tp = data?.data?.email_templates;
      const totalSynced = (ss?.synced || 0) + (em?.synced || 0) + (tp?.synced || 0);
      const totalFailed = (ss?.failed || 0) + (em?.failed || 0) + (tp?.failed || 0);
      if (totalFailed > 0) {
        toast.warning(`Published ${totalSynced} items, ${totalFailed} failed`);
      } else if (totalSynced > 0) {
        toast.success(`Successfully published ${totalSynced} items`);
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
    mutationFn: ({ table, id }: { table: "setting" | "email" | "template"; id: string }) =>
      retrySync(table, id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["c3-site-settings"] });
      qc.invalidateQueries({ queryKey: ["c3-email-config"] });
      qc.invalidateQueries({ queryKey: ["c3-email-templates"] });
      if (data?.data?.synced) {
        toast.success("Retry successful");
      } else {
        toast.error(`Retry failed: ${data?.data?.error || "Unknown error"}`);
      }
    },
    onError: (err: Error) => toast.error(`Retry failed: ${err.message}`),
  });
}
