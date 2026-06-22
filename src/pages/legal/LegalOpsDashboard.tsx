import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import TeamDashboardCard from "@/components/legal/dashboards/TeamDashboardCard";
import StaffDashboardCard from "@/components/legal/dashboards/StaffDashboardCard";

export default function LegalOpsDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/legal/lg"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Team &amp; Staff Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Live workload distribution that drives the assignment engine.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/legal/admin/staff">Manage Staff</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/legal/admin/teams">Manage Teams</Link>
          </Button>
        </div>
      </div>

      <TeamDashboardCard />
      <StaffDashboardCard />
    </div>
  );
}
