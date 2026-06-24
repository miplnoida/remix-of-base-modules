import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";

/**
 * Generic placeholder for Compliance menu items whose dedicated page is
 * scheduled in a later delivery of the restructure. Renders a friendly
 * "coming soon" panel and a back-button so the sidebar entry is never broken.
 */
export default function ComingSoon() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const title = (slug ?? "this screen")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Construction className="h-6 w-6 text-muted-foreground" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This screen is part of the Compliance &amp; Enforcement restructure
            and will be wired up in a later delivery. The menu entry is in
            place so navigation and permissions can be tested today.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
