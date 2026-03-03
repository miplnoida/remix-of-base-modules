import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, FileText, TrendingUp, Clock, CheckCircle, Plus, Eye, FileBarChart, AlertCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data for charts
const statusData = [
  { name: 'Approved', value: 1178, color: '#22c55e' },
  { name: 'Pending', value: 56, color: '#f59e0b' },
  { name: 'Rejected', value: 23, color: '#ef4444' },
];

const monthlyData = [
  { month: 'Jan', approved: 98, pending: 12, rejected: 3 },
  { month: 'Feb', approved: 102, pending: 8, rejected: 2 },
  { month: 'Mar', approved: 95, pending: 15, rejected: 4 },
  { month: 'Apr', approved: 110, pending: 9, rejected: 1 },
  { month: 'May', approved: 108, pending: 7, rejected: 3 },
  { month: 'Jun', approved: 115, pending: 5, rejected: 2 },
];

// Dashboard statistics - styled to match IPManagement.tsx exactly
const dashboardStats = [
  { label: 'Total C3 Records', value: '1,257', icon: FileText, color: 'from-secondary to-secondary/80', change: '+12%' },
  { label: 'Pending Verification', value: '56', icon: Clock, color: 'from-accent to-accent/80', change: '-4%' },
  { label: 'Approved C3s', value: '1,178', icon: CheckCircle, color: 'from-primary to-primary/80', change: '+3.4%' },
  { label: 'Rejected C3s', value: '23', icon: XCircle, color: 'from-destructive to-destructive/80', change: '-1.1%' },
];

// Mock recent C3 entries (aligned with list view columns)
const recentC3Entries = [
  {
    payerId: "500321",
    scheduleNo: "1",
    period: "Jan-2025",
    dateReceived: "25-Jun-2025",
    enteredBy: "C3svc",
    verifiedBy: "KwB",
    dateEntered: "25-Jun-2025",
    verifiedDate: "11-July-2025",
    type: "Employer",
    status: "Pending"
  },
  {
    payerId: "662892",
    scheduleNo: "1",
    period: "Dec-2025",
    dateReceived: "06-Dec-2023",
    enteredBy: "TZA",
    verifiedBy: "BNG",
    dateEntered: "12-Dec-2023",
    verifiedDate: "19-Dec-2023",
    type: "Self Employed",
    status: "Verified"
  },
  {
    payerId: "662892",
    scheduleNo: "1",
    period: "Oct-2025",
    dateReceived: "06-Dec-2023",
    enteredBy: "TZA",
    verifiedBy: "BNG",
    dateEntered: "12-Dec-2023",
    verifiedDate: "19-Dec-2023",
    type: "Voluntary Contributor",
    status: "Not Verified"
  },
  {
    payerId: "662892",
    scheduleNo: "1",
    period: "Sep-2025",
    dateReceived: "06-Dec-2023",
    enteredBy: "TZA",
    verifiedBy: "BNG",
    dateEntered: "12-Dec-2023",
    verifiedDate: "19-Dec-2023",
    type: "Self Employed",
    status: "Verified"
  }
];

export default function C3Dashboard() {
  const navigate = useNavigate();

  const handleAddNewC3 = () => {
    navigate("/c3-management/add");
  };

  const handleViewAllRecords = () => {
    navigate("/c3-management/manage");
  };

  const handlePendingReview = () => {
    navigate("/c3-management/manage?filter=pending");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-primary/10 text-primary">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-accent/30 text-accent-foreground">Pending</Badge>;
      case "Not Verified":
        return <Badge className="bg-destructive/10 text-destructive">Not Verified</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">C3 Dashboard</h1>
          <p className="text-muted-foreground">Overview of C3 contribution records and statistics</p>
        </div>
      </div>

      {/* C3 Summary Statistics Cards - matched to IPManagement.tsx */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {dashboardStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground" style={{color:'#374151'}}>{stat.label}</CardTitle>
              <div className={`p-2.5 rounded bg-gradient-to-r ${stat.color} shadow-lg`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</div>
              <p className={`text-xs font-medium ${String(stat.change).startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>C3 Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of all C3 records</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly C3 Trends</CardTitle>
            <CardDescription>C3 submission trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" fill="#22c55e" name="Approved" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common C3 management tasks and navigation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button onClick={handleAddNewC3} className="h-20 flex flex-col gap-2">
              <Plus className="h-6 w-6" />
              <span>Add New C3</span>
            </Button>
            
            <Button onClick={handleViewAllRecords} variant="outline" className="h-20 flex flex-col gap-2">
              <Eye className="h-6 w-6" />
              <span>View All Records</span>
            </Button>

            <Button onClick={handlePendingReview} variant="outline" className="h-20 flex flex-col gap-2">
              <AlertCircle className="h-6 w-6" />
              <span>Pending Review</span>
            </Button>

            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileBarChart className="h-6 w-6" />
              <span>Generate Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent C3 Entries */}
      <Card>
        <CardHeader>
          <CardTitle>C3 Records</CardTitle>
          <CardDescription>Latest C3 records submitted to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={recentC3Entries}
            columns={[
              { key: 'payerId', label: 'Payer ID', minWidth: '120px' },
              { key: 'scheduleNo', label: 'Schedule No.', minWidth: '110px' },
              { key: 'period', label: 'Period', minWidth: '100px' },
              { key: 'dateReceived', label: 'Date Received', minWidth: '130px' },
              { key: 'enteredBy', label: 'Entered By', minWidth: '110px' },
              { key: 'verifiedBy', label: 'Verified By', minWidth: '110px' },
              { key: 'dateEntered', label: 'Date Entered', minWidth: '130px' },
              { key: 'verifiedDate', label: 'Verified Date', minWidth: '130px' },
              { key: 'type', label: 'Type', minWidth: '180px' },
              { 
                key: 'status', 
                label: 'Status', 
                minWidth: '110px',
                render: (status) => getStatusBadge(status)
              }
            ]}
            title="C3 Records"
            searchPlaceholder="Search by Payer ID, Period, or Status"
            actions={{ view: true }}
            onView={(record) => handleViewAllRecords()}
          />
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={handleViewAllRecords}>
              View All C3 Records
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}