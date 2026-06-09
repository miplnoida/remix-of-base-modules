import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { toast } from 'sonner';
import {
  fetchRoleBundles,
  fetchBundleMembers,
  setBundleActive,
  type BnRoleBundle,
} from '@/services/bn/roleBundleService';

export default function RoleBundles() {
  const [bundles, setBundles] = useState<BnRoleBundle[]>([]);
  const [members, setMembers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchRoleBundles();
      setBundles(list);
      const memberMap: Record<string, string[]> = {};
      await Promise.all(
        list.map(async (b) => {
          memberMap[b.code] = await fetchBundleMembers(b.code);
        }),
      );
      setMembers(memberMap);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (code: string, active: boolean) => {
    try {
      await setBundleActive(code, active);
      toast.success(active ? 'Bundle activated' : 'Bundle deactivated');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <PermissionWrapper moduleName="benefits_management">
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Role Bundles</h1>
        <BnScreenRoleBanner
          role="library"
          description="A role bundle assigns several operational roles to a single user — useful for small offices where one officer covers intake, document review, eligibility, calculation and claims."
        />

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <div className="grid gap-4 md:grid-cols-2">
          {bundles.map((b) => (
            <Card key={b.code}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{b.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={b.is_active} onCheckedChange={(v) => toggle(b.code, v)} />
                  <Badge variant={b.is_active ? 'default' : 'outline'}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {b.description && (
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                )}
                <div>
                  <p className="text-xs font-medium mb-1">Includes roles:</p>
                  <div className="flex flex-wrap gap-1">
                    {(members[b.code] || []).map((r) => (
                      <Badge key={r} variant="secondary">{r}</Badge>
                    ))}
                    {(members[b.code] || []).length === 0 && (
                      <span className="text-xs text-muted-foreground">No member roles</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && bundles.length === 0 && (
            <p className="text-sm text-muted-foreground">No role bundles configured.</p>
          )}
        </div>
      </div>
    </PermissionWrapper>
  );
}
