import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export default function AccountRolesReport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="User Account & Roles Report"
        subtitle="Overview of user accounts and role assignments"
        breadcrumbs={[
          { label: "System Administration", href: "/admin/users" },
          { label: "Reports", href: "#" },
          { label: "Account & Roles" }
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Users" value="156" icon={UserCog} variant="info" />
        <MetricCard title="Active Users" value="142" icon={UserCog} variant="success" />
        <MetricCard title="Total Roles" value="8" icon={UserCog} variant="default" />
      </div>
      <Card>
        <CardHeader><CardTitle>User Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
            <p className="text-muted-foreground">Chart placeholder</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
