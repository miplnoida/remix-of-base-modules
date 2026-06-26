import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Loader2, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useMediaAssets } from "@/hooks/comm/useMediaAssets";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { AssetPreview } from "@/components/comm/AssetPreview";

const PORTAL_SLOTS: Array<{ key: string; label: string; description: string }> = [
  { key: "login_logo",          label: "Login Page Logo",         description: "Shown on the public sign-in screen." },
  { key: "login_background",    label: "Login Background",        description: "Backdrop behind the login form." },
  { key: "dashboard_banner",    label: "Public Portal Banner",    description: "Banner for the public landing portal." },
  { key: "announcement_banner", label: "Member Portal Banner",    description: "Banner shown to members after sign-in." },
  { key: "maintenance_banner",  label: "Employer Portal Banner",  description: "Banner shown to employers after sign-in." },
  { key: "app_icon",            label: "Mobile App Icon",         description: "Mobile launcher icon." },
  { key: "app_splash",          label: "Mobile App Splash",       description: "Splash screen used by the mobile app." },
];

function Inner() {
  const { data: assets = [], isLoading } = useMediaAssets({ activeOnly: true });
  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Public Portal Branding</h1>
          <p className="text-sm text-muted-foreground">Branding assets shown on the public, member, employer and mobile portals.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PORTAL_SLOTS.map((slot) => {
            const match = assets.find((a) => a.category === (slot.key as any));
            return (
              <Card key={slot.key}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{slot.label}</div>
                      <div className="text-xs text-muted-foreground">{slot.description}</div>
                    </div>
                    {match ? <Badge variant="secondary">Set</Badge> : <Badge variant="outline">Not set</Badge>}
                  </div>
                  <div className="h-32 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {match ? <AssetPreview asset={match} /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/admin/organization/media-library">{match ? "Change asset" : "Choose asset"}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        All portal images are stored centrally in the <Link to="/admin/organization/media-library" className="underline text-primary">Communication Assets Library</Link>. Upload, pick from library, or paste an external link there.
      </p>
    </div>
  );
}

export default function PortalBrandingPage() {
  return <PermissionWrapper moduleName="org_portal_branding"><Inner /></PermissionWrapper>;
}
