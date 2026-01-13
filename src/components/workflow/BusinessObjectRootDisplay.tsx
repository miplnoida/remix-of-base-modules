import { Database, Key, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BusinessObjectRootDisplayProps {
  primaryTable?: string | null;
  primaryKeyColumn?: string | null;
  businessKeyColumn?: string | null;
}

export function BusinessObjectRootDisplay({
  primaryTable,
  primaryKeyColumn,
  businessKeyColumn,
}: BusinessObjectRootDisplayProps) {
  if (!primaryTable) {
    return (
      <div className="p-4 border rounded-md bg-muted/50">
        <p className="text-sm text-muted-foreground">
          No Business Object Root configured for this module.
          Configure it in Module Management first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md bg-muted/30 space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Database className="h-4 w-4" />
        Business Object Root (Read-only)
      </h4>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Database className="h-3 w-3" />
            Primary Table
          </span>
          <Badge variant="secondary" className="w-fit">{primaryTable}</Badge>
        </div>
        <div className="flex flex-col gap-1 min-w-[80px]">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Key className="h-3 w-3" />
            Primary Key
          </span>
          <Badge variant="outline" className="w-fit">{primaryKeyColumn || 'id'}</Badge>
        </div>
        {businessKeyColumn && (
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Business Key
            </span>
            <Badge variant="outline" className="w-fit">{businessKeyColumn}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
