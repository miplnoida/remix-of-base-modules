
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Search, Filter, Calendar, Plus, Building2, ChevronDown } from 'lucide-react';
import { employerData } from '@/data/employerData';

const EmployersReports = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('registered');

  // Generate reports from actual employer data
  const registeredEmployers = employerData.filter(emp => emp.employerStatus === 'Active');
  const ceasedEmployers = employerData.filter(emp => emp.employerStatus === 'Inactive');
  const pendingVerification = employerData.filter(emp => emp.complianceStatus === 'Under Audit');

  // Column definitions for registered employers
  const registeredColumns: DataTableColumn[] = [
    { key: 'employerId', label: 'Employer ID', minWidth: '120px' },
    { key: 'employerName', label: 'Company Name', minWidth: '200px' },
    { key: 'businessType', label: 'Business Type', minWidth: '120px' },
    { 
      key: 'employerStatus', 
      label: 'Status', 
      minWidth: '100px',
      render: (value) => <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{value}</Badge>
    },
    { 
      key: 'registrationDate', 
      label: 'Registered Date', 
      minWidth: '120px',
      render: (value) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'numberOfEmployees', 
      label: 'Employees', 
      minWidth: '100px',
      render: (value) => value.toLocaleString()
    }
  ];

  // Column definitions for ceased employers
  const ceasedColumns: DataTableColumn[] = [
    { key: 'employerId', label: 'Employer ID', minWidth: '120px' },
    { key: 'employerName', label: 'Company Name', minWidth: '200px' },
    { key: 'businessType', label: 'Business Type', minWidth: '120px' },
    { 
      key: 'employerStatus', 
      label: 'Status', 
      minWidth: '100px',
      render: (value) => <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">{value}</Badge>
    },
    { 
      key: 'lastAuditDate', 
      label: 'Ceased Date', 
      minWidth: '120px',
      render: (value) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'employerId', 
      label: 'Reason', 
      minWidth: '150px',
      render: () => 'Business Operations Ceased'
    }
  ];

  // Column definitions for pending verification
  const pendingColumns: DataTableColumn[] = [
    { key: 'employerId', label: 'Employer ID', minWidth: '120px' },
    { key: 'employerName', label: 'Company Name', minWidth: '200px' },
    { key: 'businessType', label: 'Business Type', minWidth: '120px' },
    { 
      key: 'complianceStatus', 
      label: 'Status', 
      minWidth: '100px',
      render: (value) => <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent/40">{value}</Badge>
    },
    { 
      key: 'lastAuditDate', 
      label: 'Applied Date', 
      minWidth: '120px',
      render: (value) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'authorizedRepresentative', 
      label: 'Assigned Inspector', 
      minWidth: '150px'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/employers-management/dashboard')}
                  className="flex items-center gap-2 border-0 border-l-2 border-l-primary shadow-md"
                >
                  <ArrowLeft className="h-4 w-4" />
                 
                  <span className="sm:hidden">Back</span>
                </Button>
                <div className="h-6 w-px bg-border" />
               
                <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Employers Reports</h1>
                
                </div>
              </div>
              
      </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-5">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registered">Registered Employers</TabsTrigger>
            <TabsTrigger value="ceased">Ceased/Suspended</TabsTrigger>
            <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="registered" className="space-y-6">
            <DataTable
              data={registeredEmployers}
              columns={registeredColumns}
              title="Registered Employers"
              searchPlaceholder="Search employers..."
              actions={false}
            />
          </TabsContent>

          <TabsContent value="ceased" className="space-y-6">
            <DataTable
              data={ceasedEmployers}
              columns={ceasedColumns}
              title="Ceased/Suspended Employers"
              searchPlaceholder="Search employers..."
              actions={false}
            />
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <DataTable
              data={pendingVerification}
              columns={pendingColumns}
              title="Pending Verification"
              searchPlaceholder="Search employers..."
              actions={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployersReports;
