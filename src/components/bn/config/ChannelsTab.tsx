import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Globe, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useBnChannelConfigs,
  useUpsertBnChannelConfig,
  useEnsureBnChannelConfigs,
  useBnScreenTemplates,
  useBnWorkflowTemplates,
  useBnDocumentProfiles,
} from '@/hooks/bn/useBnConfig';
import type { BnProductChannelConfig, BnChannelCode } from '@/types/bn';
import { ReadOnlyVersionBanner } from './ReadOnlyVersionBanner';
import { ChannelConfigValidationPanel } from './ChannelConfigValidationPanel';

interface Props {
  productId: string | undefined;
  versionId: string | undefined;
  isReadOnly?: boolean;
  versionStatus?: string | null;
}

const CHANNEL_META: Record<BnChannelCode, { label: string; description: string; icon: any; defaultSource: string }> = {
  OFFLINE: {
    label: 'Offline — Staff Intake',
    description: 'How counters, walk-in, and staff-assisted applications behave.',
    icon: Users,
    defaultSource: 'STAFF_ASSISTED',
  },
  ONLINE: {
    label: 'Online — Public Portal',
    description: 'How self-service applications from the public portal behave.',
    icon: Globe,
    defaultSource: 'ONLINE',
  },
};

export function ChannelsTab({ productId, versionId, isReadOnly, versionStatus }: Props) {
  const { toast } = useToast();
  const { data: configs = [], isLoading } = useBnChannelConfigs(versionId);
  const upsertMutation = useUpsertBnChannelConfig();
  const ensureMutation = useEnsureBnChannelConfigs();
  const { data: screens = [] } = useBnScreenTemplates();
  const { data: workflows = [] } = useBnWorkflowTemplates();
  const { data: profiles = [] } = useBnDocumentProfiles();

  // Auto-seed both channel rows when version is selected and rows missing
  useEffect(() => {
    if (!productId || !versionId) return;
    if (isLoading) return;
    const have = new Set(configs.map(c => c.channel_code));
    if (!have.has('ONLINE') || !have.has('OFFLINE')) {
      ensureMutation.mutate({ productId, productVersionId: versionId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, versionId, isLoading, configs.length]);

  const byChannel = useMemo(() => {
    const m: Partial<Record<BnChannelCode, BnProductChannelConfig>> = {};
    for (const c of configs) m[c.channel_code] = c;
    return m;
  }, [configs]);

  if (!versionId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select or create a product version to configure application channels.
        </CardContent>
      </Card>
    );
  }

  const save = async (channel: BnChannelCode, patch: Partial<BnProductChannelConfig>) => {
    if (isReadOnly) return;
    const current = byChannel[channel];
    if (!current && !productId) return;
    try {
      await upsertMutation.mutateAsync({
        ...(current ?? {
          product_id: productId!,
          product_version_id: versionId,
          channel_code: channel,
          is_enabled: channel === 'OFFLINE',
          default_source: CHANNEL_META[channel].defaultSource,
        }),
        ...patch,
      });
      toast({ title: 'Saved', description: `${channel} channel updated.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Save failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <ReadOnlyVersionBanner show={!!isReadOnly} status={versionStatus} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Application Channels</CardTitle>
          <CardDescription>
            Controls how applications can be submitted for this product version — public online, staff offline,
            assisted counter, or back-office entry. (For outbound messages like email/SMS/letters, use the
            <strong> Communications</strong> tab.)
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2 text-sm text-muted-foreground">
          Eligibility, calculation, timelines, and benefit interactions are shared for the product version.
          Application channel settings control how online and offline applications collect data, require documents,
          and route workflow.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(['OFFLINE', 'ONLINE'] as BnChannelCode[]).map(channel => {
          const cfg = byChannel[channel];
          const meta = CHANNEL_META[channel];
          const Icon = meta.icon;
          return (
            <Card key={channel}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" /> {meta.label}
                    </CardTitle>
                    <CardDescription>{meta.description}</CardDescription>
                  </div>
                  <Badge variant={cfg?.is_enabled ? 'default' : 'secondary'}>
                    {cfg?.is_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Channel Enabled</Label>
                  <Switch
                    checked={cfg?.is_enabled ?? false}
                    onCheckedChange={v => save(channel, { is_enabled: v })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Screen Template</Label>
                    <Select
                      value={cfg?.screen_template_id ?? '__none__'}
                      onValueChange={v => save(channel, { screen_template_id: v === '__none__' ? null : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {screens.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.template_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Workflow Template</Label>
                    <Select
                      value={cfg?.workflow_template_id ?? '__none__'}
                      onValueChange={v => save(channel, { workflow_template_id: v === '__none__' ? null : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {workflows.map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>{w.template_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Workflow Definition ID (central engine)</Label>
                    <Input
                      value={cfg?.workflow_definition_id ?? ''}
                      placeholder="UUID of workflow_definitions row"
                      onChange={e => save(channel, { workflow_definition_id: e.target.value || null })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Document Profile</Label>
                    <Select
                      value={cfg?.document_profile_id ?? '__none__'}
                      onValueChange={v => save(channel, { document_profile_id: v === '__none__' ? null : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {profiles.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.profile_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Default Source</Label>
                    <Input
                      value={cfg?.default_source ?? meta.defaultSource}
                      onChange={e => save(channel, { default_source: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t pt-3">
                  {[
                    { k: 'allow_save_draft', label: 'Allow Save Draft' },
                    { k: 'allow_upload_later', label: 'Allow Upload Later' },
                    { k: 'requires_identity_verification', label: 'Requires Identity Verification' },
                    { k: 'requires_email_or_phone_otp', label: 'Requires Email/Phone OTP' },
                    { k: 'requires_staff_review_before_acceptance', label: 'Staff Review Before Acceptance' },
                    { k: 'blocks_submission_if_documents_missing', label: 'Block Submission if Documents Missing' },
                    { k: 'blocks_submission_if_precheck_fails', label: 'Block Submission if Precheck Fails' },
                    { k: 'correction_allowed', label: 'Allow Corrections After Submission' },
                  ].map(({ k, label }) => (
                    <div key={k} className="flex items-center justify-between">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={Boolean((cfg as any)?.[k])}
                        onCheckedChange={v => save(channel, { [k]: v } as any)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">Correction Deadline (days)</Label>
                    <Input
                      type="number"
                      className="w-28"
                      value={cfg?.correction_deadline_days ?? ''}
                      onChange={e => save(channel, {
                        correction_deadline_days: e.target.value === '' ? null : parseInt(e.target.value),
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
