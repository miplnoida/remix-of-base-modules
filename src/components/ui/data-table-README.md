# DataTable Component

A comprehensive, reusable table component with built-in pagination, search, filtering, export, and action buttons functionality.

## Features

- ✅ **Pagination** - Navigate through large datasets with configurable records per page
- ✅ **Search** - Global search across all columns with customizable placeholder text
- ✅ **Show Records** - Dropdown to select number of records per page (10, 25, 50, 100 by default)
- ✅ **Export** - Export data as CSV or PDF (implementation required)
- ✅ **Filter** - Modal dialog with checkboxes to filter by specific columns
- ✅ **Action Buttons** - Configurable view, edit, approve, and reject actions
- ✅ **Status Badges** - Custom status badge rendering
- ✅ **Responsive** - Mobile-friendly design with horizontal scrolling
- ✅ **Customizable** - Flexible column definitions with custom render functions

## Basic Usage

```tsx
import { DataTable, DataTableColumn } from '@/components/ui/data-table';

const MyComponent = () => {
  const data = [
    { id: 1, name: 'John Doe', status: 'Active' },
    { id: 2, name: 'Jane Smith', status: 'Inactive' }
  ];

  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID', minWidth: '60px' },
    { key: 'name', label: 'Name', minWidth: '120px' },
    { key: 'status', label: 'Status', minWidth: '100px' }
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      title="My Data Table"
    />
  );
};
```

## Props

### DataTableProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `any[]` | - | Array of data objects to display |
| `columns` | `DataTableColumn[]` | - | Column definitions |
| `title` | `string` | `"Data Table"` | Table title |
| `searchPlaceholder` | `string` | `"Search..."` | Search input placeholder |
| `showRecordsOptions` | `number[]` | `[10, 25, 50, 100]` | Records per page options |
| `onView` | `(row: any) => void` | - | View action handler |
| `onEdit` | `(row: any) => void` | - | Edit action handler |
| `onApprove` | `(id: number \| string) => void` | - | Approve action handler |
| `onReject` | `(id: number \| string) => void` | - | Reject action handler |
| `actions` | `ActionConfig` | `{ view: true, edit: true, approve: true, reject: true }` | Action button configuration |
| `idField` | `string` | `"id"` | Field name for unique identifier |
| `statusField` | `string` | `"status"` | Field name for status |
| `getStatusBadge` | `(status: string) => React.ReactNode` | - | Custom status badge renderer |

### DataTableColumn

| Prop | Type | Description |
|------|------|-------------|
| `key` | `string` | Data field key |
| `label` | `string` | Column header label |
| `minWidth` | `string` | Minimum column width (e.g., "100px") |
| `render` | `(value: any, row: any) => React.ReactNode` | Custom cell renderer |

## Advanced Examples

### Custom Cell Rendering

```tsx
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name' },
  { 
    key: 'date', 
    label: 'Date',
    render: (value) => new Date(value).toLocaleDateString()
  },
  { 
    key: 'salary', 
    label: 'Salary',
    render: (value) => `$${value.toLocaleString()}`
  }
];
```

### Status Badges

```tsx
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'Inactive':
      return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

<DataTable
  data={data}
  columns={columns}
  getStatusBadge={getStatusBadge}
  statusField="status"
/>
```

### Action Handlers

```tsx
const handleView = (row: any) => {
  console.log('Viewing:', row);
  // Navigate to detail page
};

const handleEdit = (row: any) => {
  console.log('Editing:', row);
  // Open edit modal
};

const handleApprove = (id: number | string) => {
  console.log('Approving:', id);
  // API call to approve
};

const handleReject = (id: number | string) => {
  console.log('Rejecting:', id);
  // API call to reject
};

<DataTable
  data={data}
  columns={columns}
  onView={handleView}
  onEdit={handleEdit}
  onApprove={handleApprove}
  onReject={handleReject}
/>
```

### Custom Action Configuration

```tsx
// Show only view and edit actions
<DataTable
  data={data}
  columns={columns}
  actions={{
    view: true,
    edit: true,
    approve: false,
    reject: false
  }}
/>

// No actions
<DataTable
  data={data}
  columns={columns}
  actions={false}
/>
```

## Styling

The component uses Tailwind CSS classes and follows the design system. Key styling features:

- **Responsive**: Adapts to different screen sizes
- **Sticky Actions**: Action column stays visible during horizontal scroll
- **Hover Effects**: Row hover states and button interactions
- **Consistent Spacing**: Uses design system spacing tokens

## Export Functionality

The export functionality is currently a placeholder. To implement actual export:

```tsx
// In the DataTable component, replace the handleExport function:
const handleExport = (format: 'csv' | 'pdf') => {
  if (format === 'csv') {
    // Implement CSV export
    const csvContent = convertToCSV(filteredData);
    downloadCSV(csvContent, `${title}.csv`);
  } else if (format === 'pdf') {
    // Implement PDF export
    generatePDF(filteredData, title);
  }
};
```

## Filter Functionality

The filter modal allows users to select which columns to show/hide. The selected filters are tracked in state but the actual filtering logic needs to be implemented based on your requirements.

## Accessibility

- Proper ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly table structure
- Focus management for modal dialogs

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires React 18+ and TypeScript 4.5+
