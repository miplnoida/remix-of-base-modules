import { useState } from "react";
import { 
  StatusBadge, 
  PageHeader, 
  MetricCard, 
  QueryByFilter, 
  ColumnSelector, 
  ExportButton,
  Column,
  FilterField
} from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

export default function FoundationComponentsDemo() {
  // Sample data for exports
  const sampleData = [
    { id: "1", name: "John Doe", email: "john@example.com", status: "Active", department: "IT" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", status: "Pending", department: "HR" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com", status: "Inactive", department: "Finance" },
  ];

  // Column management for ColumnSelector
  const [columns, setColumns] = useState<Column[]>([
    { key: "id", label: "ID", visible: true, locked: true },
    { key: "name", label: "Name", visible: true },
    { key: "email", label: "Email", visible: true },
    { key: "status", label: "Status", visible: true },
    { key: "department", label: "Department", visible: true },
    { key: "created_at", label: "Created Date", visible: false },
    { key: "updated_at", label: "Updated Date", visible: false },
  ]);

  // Filter fields for QueryByFilter
  const filterFields: FilterField[] = [
    {
      name: "search",
      label: "Search",
      type: "text",
      placeholder: "Search by name or email",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Pending", value: "pending" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    {
      name: "department",
      label: "Department",
      type: "select",
      options: [
        { label: "IT", value: "it" },
        { label: "HR", value: "hr" },
        { label: "Finance", value: "finance" },
      ],
    },
    {
      name: "created_date",
      label: "Created Date",
      type: "daterange",
    },
  ];

  const handleFilter = (filters: Record<string, any>) => {
    console.log("Applied filters:", filters);
  };

  const handleClearFilter = () => {
    console.log("Filters cleared");
  };

  const handleColumnChange = (newColumns: Column[]) => {
    setColumns(newColumns);
    console.log("Column visibility changed:", newColumns);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header Demo */}
      <PageHeader
        title="Foundation Components Demo"
        subtitle="Showcase of reusable UI components for consistent functionality across all modules"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Components" },
        ]}
        actions={
          <>
            <Button variant="outline">Secondary Action</Button>
            <Button>Primary Action</Button>
          </>
        }
      />

      <div className="space-y-8">
        {/* StatusBadge Demo */}
        <Card>
          <CardHeader>
            <CardTitle>StatusBadge Component</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Consistent status display with automatic variant detection
            </p>
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="Pending" />
              <StatusBadge status="Active" />
              <StatusBadge status="Draft" />
              <StatusBadge status="Approved" />
              <StatusBadge status="Rejected" />
              <StatusBadge status="Completed" />
              <StatusBadge status="Overdue" />
              <StatusBadge status="At Risk" />
              <StatusBadge status="Within SLA" />
              <StatusBadge status="Filed" />
              <StatusBadge status="In Progress" />
              <StatusBadge status="Closed" />
              <StatusBadge status="Suspended" />
            </div>
            <div className="mt-4 p-4 bg-muted rounded-md">
              <code className="text-sm">
                {`<StatusBadge status="Pending" />`}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* MetricCard Demo */}
        <div>
          <h2 className="text-2xl font-bold mb-4">MetricCard Component</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value="1,234"
              subtitle="Across all departments"
              icon={Users}
              variant="default"
            />
            <MetricCard
              title="Active Cases"
              value="156"
              subtitle="Requiring attention"
              icon={FileText}
              variant="success"
              trend={{ value: 12, label: "from last month", isPositive: true }}
            />
            <MetricCard
              title="Pending Reviews"
              value="42"
              subtitle="Awaiting approval"
              icon={Clock}
              variant="warning"
            />
            <MetricCard
              title="Overdue Items"
              value="8"
              subtitle="Requires immediate action"
              icon={AlertTriangle}
              variant="error"
              trend={{ value: 3, label: "from yesterday", isPositive: false }}
            />
          </div>
        </div>

        {/* QueryByFilter Demo */}
        <Card>
          <CardHeader>
            <CardTitle>QueryByFilter Component</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Collapsible multi-criteria filter system with active filter count
            </p>
            <QueryByFilter
              fields={filterFields}
              onFilter={handleFilter}
              onClear={handleClearFilter}
              defaultExpanded={false}
            />
          </CardContent>
        </Card>

        {/* ColumnSelector & ExportButton Demo */}
        <Card>
          <CardHeader>
            <CardTitle>ColumnSelector & ExportButton Components</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Dynamic table column visibility control and one-click data export
            </p>
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <ColumnSelector columns={columns} onColumnChange={handleColumnChange} />
                <ExportButton 
                  data={sampleData} 
                  filename="demo-export"
                  columns={columns.filter(col => col.visible).map(col => ({ key: col.key, label: col.label }))}
                />
              </div>
            </div>

            {/* Sample Table */}
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    {columns.filter(col => col.visible).map(col => (
                      <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      {columns.filter(col => col.visible).map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm">
                          {col.key === "status" ? (
                            <StatusBadge status={row.status} />
                          ) : (
                            row[col.key as keyof typeof row]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use These Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Import</h3>
              <div className="p-4 bg-muted rounded-md">
                <code className="text-sm">
                  {`import {
  StatusBadge,
  PageHeader,
  MetricCard,
  QueryByFilter,
  ColumnSelector,
  ExportButton
} from "@/components/shared";`}
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Benefits</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li><strong>Consistency:</strong> All modules use the same components = uniform UX</li>
                <li><strong>Maintainability:</strong> Update once, applies everywhere</li>
                <li><strong>Efficiency:</strong> No need to recreate common patterns</li>
                <li><strong>Accessibility:</strong> Built-in ARIA labels and keyboard navigation</li>
                <li><strong>Design System:</strong> Automatically follows your current design tokens</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Next Steps</h3>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="#statusbadge">View StatusBadge Usage</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#pageheader">View PageHeader Usage</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="#metriccard">View MetricCard Usage</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
