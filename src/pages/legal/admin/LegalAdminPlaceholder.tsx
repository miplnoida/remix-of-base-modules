import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

interface LegalAdminPlaceholderProps {
  title: string;
  description: string;
  permissionCode: string;
}

/**
 * Generic placeholder for Legal Admin screens that are seeded in the
 * navigation/permission tables but whose UI is not yet built.
 * Keeps the menu from having dead links while signaling intent.
 */
export default function LegalAdminPlaceholder({
  title,
  description,
  permissionCode,
}: LegalAdminPlaceholderProps) {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Construction className="h-5 w-5 text-muted-foreground" />
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This screen is registered in the Legal Admin module and gated by{" "}
            <Badge variant="outline" className="font-mono text-xs">
              {permissionCode}
            </Badge>
            . The configuration UI will be added in a follow-up iteration.
          </p>
          <p>
            Routing, permissions and menu seeding are already in place — once
            the form is built it will appear here without any menu changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
