# Foundation Components Documentation

## Overview

Foundation components are reusable UI utilities that provide consistent functionality across all modules in the SecureServe Portal application. These components were designed with the following principles:

- **Zero Design Changes**: All components use your existing design system (colors, typography, spacing)
- **Maximum Reusability**: Import once, use everywhere
- **Functional Focus**: Add capabilities without modifying existing UX
- **Type-Safe**: Full TypeScript support with proper interfaces

---

## Components

### 1. StatusBadge

**Purpose**: Standardized status display with automatic variant detection

**Features**:
- Auto-detects status variant from text (e.g., "Pending" → yellow badge)
- Supports 17+ predefined variants
- Consistent styling across all modules
- ARIA labels for accessibility

**Usage**:
```tsx
import { StatusBadge } from "@/components/shared";

// Auto-detection
<StatusBadge status="Pending Verification" />
<StatusBadge status="Active" />
<StatusBadge status="Overdue" />

// Manual variant override
<StatusBadge status="Custom Status" variant="success" />
```

**Variants**:
- `pending`, `active`, `draft`, `approved`, `rejected`, `completed`
- `overdue`, `at_risk`, `within_sla`
- `filed`, `in_progress`, `closed`, `suspended`
- `success`, `warning`, `error`, `info`

---

### 2. PageHeader

**Purpose**: Consistent page headers with breadcrumbs, title, subtitle, and actions

**Features**:
- Breadcrumb navigation with Home icon
- Title and optional subtitle
- Actions area for buttons
- Responsive layout

**Usage**:
```tsx
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

<PageHeader
  title="Insured Persons"
  subtitle="Manage all registered insured persons"
  breadcrumbs={[
    { label: "Dashboard", href: "/" },
    { label: "IP Management", href: "/persons" },
    { label: "View Person" }
  ]}
  actions={
    <>
      <Button variant="outline">Export</Button>
      <Button>Add Person</Button>
    </>
  }
/>
```

---

### 3. MetricCard

**Purpose**: Dashboard metric cards with icons, trends, and variants

**Features**:
- Icon support (Lucide icons)
- Trend indicators (↑ ↓ with percentage)
- Color-coded left border by variant
- Clickable for drill-down

**Usage**:
```tsx
import { MetricCard } from "@/components/shared";
import { Users, TrendingUp } from "lucide-react";

<MetricCard
  title="Total Registered"
  value="83,329"
  subtitle="Insured persons"
  icon={Users}
  variant="success"
  trend={{ value: 12, label: "from last month", isPositive: true }}
  onClick={() => navigate("/persons")}
/>
```

**Variants**: `default`, `success`, `warning`, `error`, `info`

---

### 4. QueryByFilter

**Purpose**: Collapsible multi-criteria filter system

**Features**:
- Expandable/collapsible panel
- Active filter count badge
- Supports text, select, date, number, and date range inputs
- Apply/Clear actions
- Grid-based responsive layout

**Usage**:
```tsx
import { QueryByFilter, FilterField } from "@/components/shared";

const filterFields: FilterField[] = [
  {
    name: "search",
    label: "Search",
    type: "text",
    placeholder: "Search by name or SSN",
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Active", value: "active" },
    ],
  },
  {
    name: "registration_date",
    label: "Registration Date",
    type: "daterange",
  },
];

<QueryByFilter
  fields={filterFields}
  onFilter={(filters) => console.log(filters)}
  onClear={() => console.log("cleared")}
  defaultExpanded={false}
/>
```

**Field Types**:
- `text`: Text input
- `number`: Number input
- `select`: Dropdown with options
- `date`: Single date picker
- `daterange`: From/To date range

---

### 5. ColumnSelector

**Purpose**: Dynamic table column visibility control

**Features**:
- Show/Hide individual columns
- Show All / Hide All quick actions
- Locked columns (cannot be hidden)
- Visual counter of visible columns
- Dropdown menu with checkboxes

**Usage**:
```tsx
import { ColumnSelector, Column } from "@/components/shared";

const [columns, setColumns] = useState<Column[]>([
  { key: "id", label: "ID", visible: true, locked: true },
  { key: "name", label: "Name", visible: true },
  { key: "email", label: "Email", visible: false },
]);

<ColumnSelector 
  columns={columns} 
  onColumnChange={setColumns} 
/>
```

---

### 6. ExportButton

**Purpose**: One-click data export to CSV, Excel, or JSON

**Features**:
- Supports CSV, Excel (.xlsx), and JSON formats
- Custom column selection
- Auto-formats filenames with timestamp
- Toast notifications for success/failure
- Handles data escaping (commas, quotes, newlines)

**Usage**:
```tsx
import { ExportButton } from "@/components/shared";

<ExportButton
  data={tableData}
  filename="insured-persons"
  columns={[
    { key: "ssn", label: "SSN" },
    { key: "name", label: "Full Name" },
    { key: "status", label: "Status" },
  ]}
/>
```

---

## Integration with Existing Code

### Replace Scattered getStatusBadge Functions

**Before** (in multiple files):
```tsx
const getStatusBadge = (status: string) => {
  switch (status) {
    case "Active": return <Badge variant="default">Active</Badge>;
    case "Pending": return <Badge variant="secondary">Pending</Badge>;
    // ... repeated in 10+ files
  }
}
```

**After** (import once):
```tsx
import { StatusBadge } from "@/components/shared";

// Use directly in tables
<StatusBadge status={row.status} />
```

### Standardize Page Headers

**Before**:
```tsx
<div className="mb-6">
  <h1 className="text-3xl font-bold">Insured Persons</h1>
  <p className="text-muted-foreground">Manage registered persons</p>
</div>
```

**After**:
```tsx
<PageHeader
  title="Insured Persons"
  subtitle="Manage registered persons"
  breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "IP Management" }]}
/>
```

---

## Utility Functions

The `src/lib/exportUtils.ts` file provides helper functions:

```tsx
import { convertToCSV, downloadFile, formatFilename } from "@/lib/exportUtils";

// Convert data to CSV string
const csv = convertToCSV(data, columns);

// Download file
downloadFile(csv, "export.csv", "text/csv");

// Format filename with timestamp
const filename = formatFilename("insured-persons", "csv", true);
// Result: "insured-persons_2025-01-19T12-30-45.csv"
```

---

## Migration Path

### Phase 1: StatusBadge (Quickest Win)
1. Search for all `getStatusBadge` functions: `lov-search-files "getStatusBadge"`
2. Replace with `<StatusBadge status={value} />`
3. Remove duplicate badge logic

### Phase 2: PageHeader
1. Find all page title sections
2. Replace with `<PageHeader />` component
3. Add breadcrumbs where applicable

### Phase 3: Export & Columns
1. Add `<ExportButton />` to table toolbars
2. Add `<ColumnSelector />` next to export buttons
3. Connect column visibility to table rendering

### Phase 4: Filters
1. Replace manual filter forms with `<QueryByFilter />`
2. Connect to existing filter state management

---

## Testing

Visit `/components-demo` to see all components in action with interactive examples.

---

## Future Enhancements

Potential additions (not implemented yet):
- **BulkActionBar**: Multi-select actions for tables
- **TimelineView**: Event history visualization
- **AuditTrail**: Change history display
- **NotificationToast**: Standardized toast notifications
- **ConfirmDialog**: Reusable confirmation dialogs
- **EmptyState**: Placeholder for empty tables/lists
