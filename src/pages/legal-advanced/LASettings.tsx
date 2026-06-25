import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMatterTypes, useWorkbaskets } from '@/hooks/legal-advanced/useLegalAdvancedData';
import { useLegalAdvancedEnabled } from '@/hooks/legal-advanced/useLegalAdvancedEnabled';

export default function LASettings() {
  const { enabled } = useLegalAdvancedEnabled();
  const { data: types = [] } = useMatterTypes();
  const { data: workbaskets = [] } = useWorkbaskets();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Module configuration</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Feature Flag</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">legal_advanced_enabled</span>
            <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Toggle this flag in the <code>feature_flags</code> table to enable or hide the module.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Matter Types ({types.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {types.map((t: any) => (
              <div key={t.id} className="flex justify-between text-sm border-b py-1 last:border-0">
                <span>{t.display_name}</span>
                <span className="text-xs text-muted-foreground">{t.category}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Workbaskets ({workbaskets.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {workbaskets.map((w: any) => (
              <div key={w.id} className="flex justify-between text-sm border-b py-1 last:border-0">
                <span>{w.display_name}</span>
                <span className="text-xs text-muted-foreground">{w.is_team ? 'Team' : 'Personal'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
