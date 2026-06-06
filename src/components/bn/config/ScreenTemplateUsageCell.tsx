import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Link2Off } from 'lucide-react';
import { useBnScreenTemplateUsage } from '@/hooks/bn/useBnScreenTemplateUsage';

interface Props {
  templateId: string;
}

/**
 * Library row helper — shows how many product versions consume a screen
 * template and offers a jump link to the most recent active product version's
 * Preview tab in Product Catalogue.
 */
export function ScreenTemplateUsageCell({ templateId }: Props) {
  const { data, isLoading } = useBnScreenTemplateUsage(templateId);

  if (isLoading) {
    return <Badge variant="outline" className="text-xs">…</Badge>;
  }

  const refs = data?.references ?? [];
  const total = refs.length;
  const activeRefs = refs.filter(r => r.status === 'ACTIVE');
  const target =
    activeRefs.find(r => !!r.product_id) ??
    refs.find(r => !!r.product_id);

  if (total === 0) {
    return (
      <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
        <Link2Off className="h-3 w-3" /> Unused
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="secondary" className="text-xs">
        {total} version{total === 1 ? '' : 's'}
        {activeRefs.length > 0 && ` · ${activeRefs.length} active`}
      </Badge>
      {target?.product_id && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title={`Open ${target.product_name ?? 'product'} → Preview`}
        >
          <Link to={`/bn/config/products/${target.product_id}?versionId=${target.product_version_id}&tab=preview`}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
