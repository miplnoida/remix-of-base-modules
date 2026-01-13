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
      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Primary Table:</span>
          <Badge variant="secondary">{primaryTable}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Primary Key:</span>
          <Badge variant="outline">{primaryKeyColumn || 'id'}</Badge>
        </div>
        {businessKeyColumn && (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Business Key:</span>
            <Badge variant="outline">{businessKeyColumn}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
