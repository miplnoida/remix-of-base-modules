import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function AdminConfiguration() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>Admin Configuration</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Configure heads, lookups, and system settings</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bema-card"><CardContent className="pt-6 text-center"><Settings className="h-12 w-12 mx-auto mb-2" style={{ color: "hsl(var(--bema-primary))" }} /><p className="bema-h2">Financial Heads</p></CardContent></Card>
        <Card className="bema-card"><CardContent className="pt-6 text-center"><Settings className="h-12 w-12 mx-auto mb-2" style={{ color: "hsl(var(--bema-primary))" }} /><p className="bema-h2">Lookup Tables</p></CardContent></Card>
        <Card className="bema-card"><CardContent className="pt-6 text-center"><Settings className="h-12 w-12 mx-auto mb-2" style={{ color: "hsl(var(--bema-primary))" }} /><p className="bema-h2">System Settings</p></CardContent></Card>
      </div>
    </div>
  );
}
