import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import {
  useOnlineResponseSettings,
  useUpdateOnlineResponseSettings,
} from '@/hooks/useOnlineResponse';
import { DELIVERY_CHANNEL_OPTIONS } from '@/types/onlineResponse';

export function OnlineResponseGlobalSettingsTab() {
  const { data: settings, isLoading } = useOnlineResponseSettings();
  const update = useUpdateOnlineResponseSettings();

  const [draft, setDraft] = useState<any>(null);
  const current = draft ?? settings;

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = (k: string, v: any) => setDraft({ ...(current as any), [k]: v });

  const toggleChannel = (ch: string) => {
    const arr: string[] = current.allowed_delivery_channels || [];
    set(
      'allowed_delivery_channels',
      arr.includes(ch) ? arr.filter((x) => x !== ch) : [...arr, ch],
    );
  };

  const save = async () => {
    if (!draft) return;
    try {
      await update.mutateAsync({
        id: settings.id,
        patch: {
          enabled: draft.enabled,
          require_secure_token: draft.require_secure_token,
          default_link_ttl_hours: Number(draft.default_link_ttl_hours) || 168,
          view_only_when_disabled: draft.view_only_when_disabled,
          allowed_delivery_channels: draft.allowed_delivery_channels,
        },
      });
      setDraft(null);
      toast.success('Online response settings updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update settings');
    }
  };

  return (
    <div className="space-y-4">
      {!current.enabled && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-amber-900">
                Employer Online Response is currently disabled.
              </span>{' '}
              <span className="text-amber-800">
                No portal links, acknowledgments, uploads, clarifications or disputes will be
                accepted regardless of policy or template configuration.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Master Switch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 py-2">
            <div>
              <Label className="text-sm font-medium">Enable Employer Online Response</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When OFF, all employer portal actions are blocked. When ON, policies and template
                defaults determine what is permitted per communication.
              </p>
            </div>
            <Switch
              checked={!!current.enabled}
              onCheckedChange={(v) => set('enabled', v)}
            />
          </div>

          <div className="flex items-start justify-between gap-4 py-2 border-t pt-4">
            <div>
              <Label className="text-sm font-medium">View-only fallback when disabled</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                If master is OFF, allow employer to still view the document PDF (no responses).
              </p>
            </div>
            <Switch
              checked={!!current.view_only_when_disabled}
              onCheckedChange={(v) => set('view_only_when_disabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Security &amp; Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Require secure token on portal links</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Employer must use the signed secure link from the email/SMS to access the portal.
              </p>
            </div>
            <Switch
              checked={!!current.require_secure_token}
              onCheckedChange={(v) => set('require_secure_token', v)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <Label className="text-xs text-muted-foreground">Default link TTL (hours)</Label>
              <Input
                type="number"
                min={1}
                value={current.default_link_ttl_hours || 168}
                onChange={(e) => set('default_link_ttl_hours', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {Math.round((Number(current.default_link_ttl_hours) || 168) / 24)} day(s) — used
                when a policy / template does not specify its own TTL.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Allowed Delivery Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Channels permitted to carry the portal link to the employer.
          </p>
          <div className="flex flex-wrap gap-2">
            {DELIVERY_CHANNEL_OPTIONS.map((ch) => {
              const active = (current.allowed_delivery_channels || []).includes(ch);
              return (
                <Badge
                  key={ch}
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleChannel(ch)}
                >
                  {ch}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background/80 backdrop-blur py-3">
        {draft && (
          <Button variant="outline" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        )}
        <Button onClick={save} disabled={!draft || update.isPending}>
          {update.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
