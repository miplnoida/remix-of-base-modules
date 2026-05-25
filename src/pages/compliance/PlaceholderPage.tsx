import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  area?: string;
}

/**
 * Generic Compliance & Enforcement placeholder.
 * Surfaces a clear "Configuration or implementation pending" message
 * so reviewers know the route exists but the screen has not been built
 * yet. Never renders fake business data.
 */
const PlaceholderPage = ({ title, area }: PlaceholderPageProps) => {
  return (
    <div className="p-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Construction className="h-6 w-6 text-muted-foreground" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Configuration or implementation pending.
          </p>
          <p>
            This screen is part of the Compliance &amp; Enforcement module
            {area ? ` (${area})` : ""}. The route is reserved in the menu so
            permissions, navigation, and links can be wired now, but the
            functional UI has not been implemented yet.
          </p>
          <p>
            No mock or placeholder business data is shown here. Real data will
            appear once the underlying tables, services, and workflow steps are
            available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
