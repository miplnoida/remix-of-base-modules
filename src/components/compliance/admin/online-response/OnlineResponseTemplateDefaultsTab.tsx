import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info } from 'lucide-react';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { ONLINE_RESPONSE_MODE_LABELS } from '@/types/onlineResponse';

/**
 * Read-only view of template-level defaults (policy resolution layer 3).
 * Editing template defaults is done from the Communication Templates page.
 */
export function OnlineResponseTemplateDefaultsTab() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['audit-communication-templates', 'all'],
    queryFn: () => auditCommunicationTemplateService.list(),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Template-level Online Response Defaults</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Each communication template can define its own default online response behavior. These
          values are used when no policy in the matrix matches.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No communication templates found.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t: any) => {
              const mode = t.default_response_mode || 'NONE';
              const enabled = !!t.default_portal_enabled;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.template_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.template_code} · {t.comm_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {ONLINE_RESPONSE_MODE_LABELS[mode as keyof typeof ONLINE_RESPONSE_MODE_LABELS] || mode}
                    </Badge>
                    <Badge
                      variant={enabled ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {enabled ? 'Portal default ON' : 'Portal default OFF'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 p-3 bg-muted/40 rounded-md text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            To change a template's default mode, open the template from the{' '}
            <strong>Communication Templates</strong> page. Defaults are always overridable by a
            matching policy or per-instance configuration at send time.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
