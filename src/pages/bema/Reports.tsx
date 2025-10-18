import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function BemaReports() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reports & Dashboards</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {["Inspector Activity", "Audit Coverage", "Recovery Progress"].map((title, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{title}</CardTitle>
              <BarChart3 className="h-4 w-4" />
            </CardHeader>
            <CardContent><p className="text-muted-foreground">KPI data will appear here</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
