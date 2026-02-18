import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Plus, Edit, Trash2, Eye, EyeOff, CheckCircle2,
  Server, Zap, TestTube, Star, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type EmailProviderType = "smtp" | "resend";

interface EmailProvider {
  id: string;
  channel: string;
  provider_name: string;
  display_name: string | null;
  description: string | null;
  email_provider_type: EmailProviderType;
  is_active: boolean;
  is_default: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ── Field definitions ──────────────────────────────────────────────────────────
const SMTP_FIELDS: { key: string; label: string; type: string; placeholder: string; secret?: boolean; required?: boolean }[] = [
  { key: "smtp_host",     label: "SMTP Host",       type: "text",     placeholder: "smtp.example.com",  required: true  },
  { key: "smtp_port",     label: "SMTP Port",       type: "number",   placeholder: "587",               required: true  },
  { key: "smtp_user",     label: "Username",        type: "text",     placeholder: "user@example.com",  required: true  },
  { key: "smtp_password", label: "Password",        type: "password", placeholder: "••••••••",          required: true, secret: true },
  { key: "smtp_secure",   label: "Use TLS/SSL",     type: "boolean",  placeholder: ""                                   },
  { key: "from_email",    label: "From Email",      type: "email",    placeholder: "noreply@domain.com", required: true },
  { key: "from_name",     label: "From Name",       type: "text",     placeholder: "My App Notifications"               },
];

const RESEND_FIELDS: { key: string; label: string; type: string; placeholder: string; secret?: boolean; required?: boolean }[] = [
  { key: "api_key",    label: "Resend API Key", type: "password", placeholder: "re_••••••••••••",       required: true, secret: true },
  { key: "from_email", label: "From Email",     type: "email",    placeholder: "info@secureserve.biz", required: true },
  { key: "from_name",  label: "From Name",      type: "text",     placeholder: "My App Notifications"               },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const maskSecret = (val: string | undefined): string => {
  if (!val) return "";
  if (val.length <= 8) return "••••••••";
  return val.slice(0, 4) + "••••••••" + val.slice(-4);
};

// ── Validation ─────────────────────────────────────────────────────────────────
function validateProvider(type: EmailProviderType, config: Record<string, any>, name: string): string[] {
  const errors: string[] = [];
  if (!name.trim()) errors.push("Provider name is required");

  if (type === "smtp") {
    if (!config.smtp_host?.trim())     errors.push("SMTP Host is required");
    if (!config.smtp_port)             errors.push("SMTP Port is required");
    if (Number(config.smtp_port) < 1 || Number(config.smtp_port) > 65535) errors.push("SMTP Port must be between 1 and 65535");
    if (!config.smtp_user?.trim())     errors.push("Username is required");
    if (!config.smtp_password?.trim()) errors.push("Password is required");
    if (!config.from_email?.trim())    errors.push("From Email is required");
    if (config.from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.from_email)) errors.push("From Email is not valid");
  }

  if (type === "resend") {
    if (!config.api_key?.trim())    errors.push("Resend API Key is required");
    if (!config.from_email?.trim()) errors.push("From Email is required");
    if (config.from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.from_email)) errors.push("From Email is not valid");
    if (config.api_key && !config.api_key.startsWith("re_")) errors.push("Resend API Key must start with 're_'");
  }

  return errors;
}

// ── Provider Form ──────────────────────────────────────────────────────────────
interface ProviderFormProps {
  form: {
    provider_name: string;
    display_name: string;
    description: string;
    email_provider_type: EmailProviderType;
    config: Record<string, any>;
  };
  onChange: (form: ProviderFormProps["form"]) => void;
  isEditing: boolean;
}

function ProviderForm({ form, onChange, isEditing }: ProviderFormProps) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const toggleSecret = (key: string) =>
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));

  const setConfig = (key: string, val: any) =>
    onChange({ ...form, config: { ...form.config, [key]: val } });

  const fields = form.email_provider_type === "smtp" ? SMTP_FIELDS : RESEND_FIELDS;

  return (
    <div className="space-y-5">
      {/* Provider type selector */}
      {!isEditing && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Provider Type *</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["smtp", "resend"] as EmailProviderType[]).map((type) => {
              const isSelected = form.email_provider_type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange({ ...form, email_provider_type: type, config: {} })}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all text-center focus:outline-none",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-background hover:border-primary/60 hover:bg-muted/50 text-foreground"
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    </span>
                  )}
                  {type === "smtp" ? (
                    <Server className={cn("h-6 w-6", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
                  ) : (
                    <Zap className={cn("h-6 w-6", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
                  )}
                  <div>
                    <p className={cn("font-semibold text-sm", isSelected ? "text-primary-foreground" : "text-foreground")}>
                      {type === "smtp" ? "SMTP" : "Resend"}
                    </p>
                    <p className={cn("text-xs", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {type === "smtp" ? "Custom mail server" : "API-based delivery"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
          {form.email_provider_type === "smtp"
            ? <Server className="h-4 w-4 text-muted-foreground" />
            : <Zap className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium capitalize">{form.email_provider_type} Provider</span>
          <Badge variant="secondary" className="ml-auto text-xs">Cannot change type</Badge>
        </div>
      )}

      <Separator />

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-sm font-medium">Provider Name *</Label>
          <Input
            value={form.provider_name}
            onChange={(e) => onChange({ ...form, provider_name: e.target.value })}
            placeholder="e.g., Production SMTP, Primary Resend"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Display Name</Label>
          <Input
            value={form.display_name}
            onChange={(e) => onChange({ ...form, display_name: e.target.value })}
            placeholder="Friendly display name"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Description</Label>
          <Input
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            placeholder="Optional notes"
          />
        </div>
      </div>

      <Separator />

      {/* Dynamic config fields */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">
          {form.email_provider_type === "smtp" ? "SMTP Configuration" : "Resend Configuration"}
        </p>
        {fields.map((field) => {
          if (field.type === "boolean") {
            return (
              <div key={field.key} className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{field.label}</Label>
                <Switch
                  checked={!!form.config[field.key]}
                  onCheckedChange={(v) => setConfig(field.key, v)}
                />
              </div>
            );
          }
          const isSecret = !!field.secret;
          const effectiveType = isSecret && !showSecrets[field.key] ? "password" : field.type === "password" ? "text" : field.type;
          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm font-medium">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  type={effectiveType}
                  value={form.config[field.key] ?? ""}
                  onChange={(e) => setConfig(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex-1"
                />
                {isSecret && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSecret(field.key)}
                    title={showSecrets[field.key] ? "Hide" : "Show"}
                  >
                    {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Provider Card ──────────────────────────────────────────────────────────────
interface ProviderCardProps {
  provider: EmailProvider;
  onEdit: (p: EmailProvider) => void;
  onDelete: (p: EmailProvider) => void;
  onSetDefault: (p: EmailProvider) => void;
  onTest: (p: EmailProvider) => void;
  isTestingId: string | null;
  isSettingDefault: boolean;
}

function ProviderCard({ provider, onEdit, onDelete, onSetDefault, onTest, isTestingId, isSettingDefault }: ProviderCardProps) {
  const isSmtp = provider.email_provider_type === "smtp";
  const fromEmail = provider.config?.from_email || "—";
  const isTestingThis = isTestingId === provider.id;

  return (
    <Card className={cn(
      "relative transition-all",
      provider.is_default && "ring-2 ring-primary ring-offset-2"
    )}>
      {provider.is_default && (
        <div className="absolute -top-3 left-4">
          <Badge className="bg-primary text-primary-foreground gap-1 shadow-sm">
            <Star className="h-3 w-3 fill-current" /> Active Provider
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isSmtp ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground"
            )}>
              {isSmtp ? <Server className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base">{provider.display_name || provider.provider_name}</CardTitle>
              <CardDescription className="text-xs">
                {provider.provider_name} · {isSmtp ? "SMTP" : "Resend API"}
              </CardDescription>
            </div>
          </div>
          <Badge variant={provider.is_active ? "default" : "secondary"} className="shrink-0">
            {provider.is_active ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Config summary */}
        <div className="rounded-md bg-muted/40 p-3 space-y-1.5 text-sm">
          {isSmtp ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host</span>
                <span className="font-mono text-xs">{provider.config?.smtp_host || "—"}:{provider.config?.smtp_port || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono text-xs">{provider.config?.smtp_user || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Password</span>
                <span className="font-mono text-xs text-muted-foreground">{maskSecret(provider.config?.smtp_password)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Key</span>
              <span className="font-mono text-xs text-muted-foreground">{maskSecret(provider.config?.api_key)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">From</span>
            <span className="font-mono text-xs">{fromEmail}</span>
          </div>
        </div>

        {provider.description && (
          <p className="text-xs text-muted-foreground">{provider.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!provider.is_default && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-xs"
              onClick={() => onSetDefault(provider)}
              disabled={isSettingDefault}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Set as Active
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onTest(provider)}
            disabled={isTestingThis}
          >
            {isTestingThis
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <TestTube className="h-3.5 w-3.5" />}
            {isTestingThis ? "Testing…" : "Test"}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => onEdit(provider)}>
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(provider)}
            disabled={provider.is_default}
            title={provider.is_default ? "Cannot delete the active provider" : "Delete provider"}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  provider_name: "",
  display_name: "",
  description: "",
  email_provider_type: "smtp" as EmailProviderType,
  config: {} as Record<string, any>,
};

const ProviderSettings = () => {
  const [showDialog, setShowDialog]       = useState(false);
  const [editingProvider, setEditingProvider] = useState<EmailProvider | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<EmailProvider | null>(null);
  const [testingId, setTestingId]         = useState<string | null>(null);
  const [testEmail, setTestEmail]         = useState("");
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testTargetProvider, setTestTargetProvider] = useState<EmailProvider | null>(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["email-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_providers")
        .select("*")
        .eq("channel", "email")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as EmailProvider[];
    },
  });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const errors = validateProvider(form.email_provider_type, form.config, form.provider_name);
      if (errors.length) throw Object.assign(new Error("Validation failed"), { validationErrors: errors });

      const basePayload = {
        provider_name:       form.provider_name.trim(),
        display_name:        form.display_name.trim() || null,
        description:         form.description.trim() || null,
        email_provider_type: form.email_provider_type,
        channel:             "email" as const,
        config:              form.config,
        updated_at:          new Date().toISOString(),
      };

      if (editingProvider?.id) {
        const { error } = await supabase
          .from("notification_providers")
          .update(basePayload)
          .eq("id", editingProvider.id);
        if (error) throw error;
      } else {
        // is_default stored in config until schema type regenerates
        const { error } = await supabase
          .from("notification_providers")
          .insert([{ ...basePayload, is_active: true }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-providers"] });
      toast.success(editingProvider ? "Provider updated successfully" : "Provider added successfully");
      setShowDialog(false);
      setValidationErrors([]);
    },
    onError: (err: any) => {
      if (err.validationErrors) {
        setValidationErrors(err.validationErrors);
      } else {
        toast.error(err.message || "Failed to save provider");
      }
    },
  });

  // ── Set Default ───────────────────────────────────────────────────────────────
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const setDefaultMutation = useMutation({
    mutationFn: async (provider: EmailProvider) => {
      const { error } = await supabase.rpc("set_email_provider_default", {
        provider_id: provider.id,
      } as any);
      if (error) throw error;
    },
    onMutate: () => setIsSettingDefault(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-providers"] });
      toast.success("Active provider updated");
      setIsSettingDefault(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to set active provider");
      setIsSettingDefault(false);
    },
  });

  // ── Delete ────────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-providers"] });
      toast.success("Provider deleted");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete provider"),
  });

  // ── Test ──────────────────────────────────────────────────────────────────────
  const testMutation = useMutation({
    mutationFn: async ({ provider, toEmail }: { provider: EmailProvider; toEmail: string }) => {
      setTestingId(provider.id);

      // Build a minimal test campaign via the edge function
      const { data, error } = await supabase.functions.invoke("send-email-campaign", {
        body: {
          name:             `[TEST] ${provider.provider_name}`,
          subject:          "Test Email from Email Provider Configuration",
          html_body:        `<h2>Test Email</h2><p>This is a test email sent from provider <strong>${provider.display_name || provider.provider_name}</strong> to verify configuration.</p><p>If you received this, the provider is configured correctly.</p>`,
          plain_body:       `Test email from provider: ${provider.provider_name}`,
          from_name:        provider.config?.from_name || "SSBM Notifications",
          from_email:       provider.config?.from_email || provider.config?.from_email,
          recipient_filter: "custom",
          recipient_emails: [toEmail],
          force_provider_id: provider.id,
        },
      });
      if (error) throw error;

      // Log to email_provider_test_logs
      await supabase.from("email_provider_test_logs").insert({
        provider_id:   provider.id,
        test_to:       toEmail,
        status:        data?.success ? "sent" : "failed",
        response_data: data,
        error_message: data?.error || null,
      });

      return data;
    },
    onSuccess: (data) => {
      setTestingId(null);
      setShowTestDialog(false);
      if (data?.success) {
        toast.success("Test email sent successfully! Check your inbox.");
      } else {
        toast.error(`Test failed: ${data?.error || "Unknown error"}`);
      }
    },
    onError: (err: any) => {
      setTestingId(null);
      toast.error(err.message || "Test send failed");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingProvider(null);
    setForm(EMPTY_FORM);
    setValidationErrors([]);
    setShowDialog(true);
  };

  const handleOpenEdit = (provider: EmailProvider) => {
    setEditingProvider(provider);
    setForm({
      provider_name:       provider.provider_name,
      display_name:        provider.display_name || "",
      description:         provider.description || "",
      email_provider_type: provider.email_provider_type || "smtp",
      config:              provider.config || {},
    });
    setValidationErrors([]);
    setShowDialog(true);
  };

  const handleOpenTest = (provider: EmailProvider) => {
    setTestTargetProvider(provider);
    setTestEmail("");
    setShowTestDialog(true);
  };

  const defaultProvider = providers.find(p => p.is_default);
  const smtpProviders   = providers.filter(p => p.email_provider_type === "smtp");
  const resendProviders = providers.filter(p => p.email_provider_type === "resend");

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Providers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure SMTP and Resend providers for outgoing email. One provider is designated as <strong>Active</strong> and used for all dispatches.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Active provider banner */}
      {defaultProvider ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Active Provider: </span>
            <span>{defaultProvider.display_name || defaultProvider.provider_name}</span>
            <span className="text-muted-foreground ml-2">
              ({defaultProvider.email_provider_type === "smtp" ? "SMTP" : "Resend"} · {defaultProvider.config?.from_email || "no from email"})
            </span>
          </div>
        </div>
      ) : providers.length > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            No active provider selected. Email dispatch is disabled until you set one provider as Active.
          </p>
        </div>
      ) : null}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && providers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Mail className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No email providers configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add an SMTP or Resend provider to enable outgoing email.
              </p>
            </div>
            <Button onClick={handleOpenAdd} className="mt-2 gap-2">
              <Plus className="h-4 w-4" /> Add Your First Provider
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SMTP Section */}
      {smtpProviders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">SMTP Providers</h2>
            <Badge variant="secondary">{smtpProviders.length}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {smtpProviders.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                onEdit={handleOpenEdit}
                onDelete={setDeleteTarget}
                onSetDefault={(prov) => setDefaultMutation.mutate(prov)}
                onTest={handleOpenTest}
                isTestingId={testingId}
                isSettingDefault={isSettingDefault}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resend Section */}
      {resendProviders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-foreground" />
            <h2 className="font-semibold text-sm">Resend Providers</h2>
            <Badge variant="secondary">{resendProviders.length}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {resendProviders.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                onEdit={handleOpenEdit}
                onDelete={setDeleteTarget}
                onSetDefault={(prov) => setDefaultMutation.mutate(prov)}
                onTest={handleOpenTest}
                isTestingId={testingId}
                isSettingDefault={isSettingDefault}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setValidationErrors([]); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingProvider
                ? <><Edit className="h-4 w-4" /> Edit Provider</>
                : <><Plus className="h-4 w-4" /> Add Email Provider</>}
            </DialogTitle>
          </DialogHeader>

          {/* Validation summary */}
          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-semibold text-destructive mb-1">
                Please fix {validationErrors.length} error{validationErrors.length > 1 ? "s" : ""} before saving:
              </p>
              <ul className="text-xs text-destructive space-y-0.5 list-disc list-inside">
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <ProviderForm
            form={form}
            onChange={(f) => {
              setForm(f);
              setValidationErrors([]);
            }}
            isEditing={!!editingProvider}
          />

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editingProvider ? "Update Provider" : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Send Test Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Send a test email via <strong>{testTargetProvider?.display_name || testTargetProvider?.provider_name}</strong> to verify configuration.
            </p>
            <div className="space-y-1.5">
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
                  toast.error("Please enter a valid recipient email");
                  return;
                }
                if (testTargetProvider) {
                  testMutation.mutate({ provider: testTargetProvider, toEmail: testEmail });
                }
              }}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> Sending…</> : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.display_name || deleteTarget?.provider_name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProviderSettings;
