import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  listFeatureConfigRows,
  updateFeatureToggle,
  type FeatureConfigRow,
  type FeatureKey,
} from '@/services/external/portalFeatureConfigService';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useQueryClient } from '@tanstack/react-query';

export default function ExternalPortalSettings() {
  const [rows, setRows] = useState<FeatureConfigRow[] | null>(null);
  const [savingKey, setSavingKey] = useState<FeatureKey | null>(null);
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const performedBy =
    (user as any)?.user_metadata?.user_code ??
    user?.email ??
    user?.id ??
    'SYSTEM';

  async function load() {
    const data = await listFeatureConfigRows();
    setRows(data);
  }
  useEffect(() => {
    load();
  }, []);

  async function onToggle(row: FeatureConfigRow, next: boolean) {
    setSavingKey(row.feature_key);
    try {
      await updateFeatureToggle(row.feature_key, next, performedBy);
      toast.success(`${row.feature_name} ${next ? 'enabled' : 'disabled'}`);
      await load();
      qc.invalidateQueries({ queryKey: ['external-portal-feature-config'] });
    } catch (e) {
      toast.error('Could not update feature', {
        description: (e as Error).message,
      });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">External Portal Settings</h1>
        <p className="text-sm text-muted-foreground">
          Control which features are available in the Social Security Self-Service Portal.
          Disabling a feature hides its menu, blocks deep links, and is enforced server-side.
        </p>
      </div>

      {!rows ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No feature toggles configured.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map(row => (
            <Card key={row.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {row.feature_name}
                      <Badge variant={row.enabled ? 'default' : 'secondary'}>
                        {row.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </CardTitle>
                    {row.description && (
                      <CardDescription>{row.description}</CardDescription>
                    )}
                  </div>
                  <Switch
                    checked={row.enabled}
                    disabled={savingKey === row.feature_key}
                    onCheckedChange={next => onToggle(row, next)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-3 md:grid-cols-2 text-xs">
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      Affected personas
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {row.affected_personas.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        row.affected_personas.map(p => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      Affected menus
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {row.affected_menus.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        row.affected_menus.map(m => (
                          <Badge key={m} variant="outline">{m}</Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 text-muted-foreground">
                    Last updated by{' '}
                    <span className="font-medium text-foreground">
                      {row.last_updated_by ?? '—'}
                    </span>{' '}
                    on{' '}
                    <span className="font-medium text-foreground">
                      {new Date(row.last_updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
