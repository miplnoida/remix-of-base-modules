import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  /** Which Internal LAN module is the source of truth for this screen. */
  internalSource?: string;
}

/**
 * Used by every external portal page that surfaces Internal LAN data.
 * Until each API action is wired end-to-end, this renders a consistent
 * "powered by Internal LAN" stub so the navigation, sidebar and audit
 * trail are complete and verifiable.
 */
export function PortalModulePlaceholder({ title, description, internalSource }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {internalSource && (
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Server className="h-3 w-3" /> {internalSource}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>
          This page is wired to the external portal API. The Internal LAN system is the
          source of truth — no business logic runs here.
        </p>
        <p className="text-xs">
          Data for this screen is exposed through the <code>public-benefits</code> edge
          function. Once the matching Internal API action is enabled it will populate
          automatically; until then this screen shows the placeholder.
        </p>
      </CardContent>
    </Card>
  );
}

export default PortalModulePlaceholder;
