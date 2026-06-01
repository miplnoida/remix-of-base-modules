import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PowerOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  flagKey: string;
  description?: string;
}

/**
 * Shown when a Compliance feature is turned OFF in
 * Setup → Feature Toggles. Distinct from PlaceholderPage
 * (which means "not yet built").
 */
export default function FeatureDisabled({ title, flagKey, description }: Props) {
  return (
    <div className="p-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <PowerOff className="h-6 w-6 text-muted-foreground" />
            <CardTitle>{title} is currently disabled</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            This feature has been turned off by an administrator.
          </p>
          {description && <p>{description}</p>}
          <p>
            Re-enable it from{' '}
            <Link to="/compliance/admin/feature-toggles" className="text-primary underline">
              Setup → Feature Toggles
            </Link>{' '}
            (flag key <code className="px-1 py-0.5 bg-muted rounded">{flagKey}</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
