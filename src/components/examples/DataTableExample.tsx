import React from 'react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

interface DataTableExampleProps {
  sampleData?: any[];
}

const DataTableExample: React.FC<DataTableExampleProps> = ({ 
  sampleData = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      status: 'Active',
      role: 'Admin',
      department: 'IT',
      joinDate: '2023-01-15',
      salary: 75000
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      status: 'Inactive',
      role: 'User',
      department: 'HR',
      joinDate: '2023-03-20',
      salary: 65000
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      status: 'Active',
      role: 'Manager',
      department: 'Sales',
      joinDate: '2022-11-10',
      salary: 85000
    }
  ]
}) => {
  // Define columns
  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID', minWidth: '60px' },
    { key: 'name', label: 'Name', minWidth: '120px' },
    { key: 'email', label: 'Email', minWidth: '200px' },
    { key: 'status', label: 'Status', minWidth: '100px' },
    { key: 'role', label: 'Role', minWidth: '100px' },
    { key: 'department', label: 'Department', minWidth: '120px' },
    { 
      key: 'joinDate', 
      label: 'Join Date', 
      minWidth: '120px',
      render: (value) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'salary', 
      label: 'Salary', 
      minWidth: '100px',
      render: (value) => `$${value.toLocaleString()}`
    }
  ];

  // Status badge function
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Event handlers
  const handleView = (row: any) => {
    console.log('View:', row);
  };

  const handleEdit = (row: any) => {
    console.log('Edit:', row);
  };

  const handleApprove = (id: number | string) => {
    console.log('Approve:', id);
  };

  const handleReject = (id: number | string) => {
    console.log('Reject:', id);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">DataTable Component Examples</h2>
      
      {/* Example 1: Full featured table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Full Featured Table</h3>
        <DataTable
          data={sampleData}
          columns={columns}
          title="Employee Directory"
          searchPlaceholder="Search employees..."
          showRecordsOptions={[5, 10, 25, 50]}
          onView={handleView}
          onEdit={handleEdit}
          onApprove={handleApprove}
          onReject={handleReject}
          actions={{
            view: true,
            edit: true,
            approve: true,
            reject: true
          }}
          idField="id"
          statusField="status"
          getStatusBadge={getStatusBadge}
        />
      </div>

      {/* Example 2: Read-only table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Read-Only Table</h3>
        <DataTable
          data={sampleData}
          columns={columns}
          title="Employee List (Read-Only)"
          searchPlaceholder="Search employees..."
          actions={{
            view: true,
            edit: false,
            approve: false,
            reject: false
          }}
          idField="id"
          statusField="status"
          getStatusBadge={getStatusBadge}
        />
      </div>

      {/* Example 3: Minimal table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Minimal Table</h3>
        <DataTable
          data={sampleData}
          columns={columns.slice(0, 4)} // Only first 4 columns
          title="Simple Employee List"
          searchPlaceholder="Search..."
          showRecordsOptions={[3, 5, 10]}
          actions={false} // No actions
        />
      </div>
    </div>
  );
};

export default DataTableExample;
