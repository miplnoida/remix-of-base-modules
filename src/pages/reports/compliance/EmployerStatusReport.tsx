import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function EmployerStatusReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Employer Compliance Status"
        subtitle="Overview of employer compliance with regulations"
        breadcrumbs={[
          { label: "Compliance", href: "#" },
          { label: "Reports", href: "#" },
          { label: "Employer Status" }
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard title="Compliant" value="1,089" icon={CheckCircle} variant="success" />
        <MetricCard title="Non-Compliant" value="67" icon={AlertCircle} variant="error" />
      </div>
      <Card>
        <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Chart placeholder</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
