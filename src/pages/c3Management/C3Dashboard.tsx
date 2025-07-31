import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

// Mock recent C3 entries
const recentC3Entries = [
  {
    id: "C3-2024-001",
    employerName: "ABC Company Ltd",
    period: "2024-01",
    dateSubmitted: "2024-01-15",
    status: "Approved",
    amount: 15750.00
  },
  {
    id: "C3-2024-002", 
    employerName: "XYZ Enterprises",
    period: "2024-01",
    dateSubmitted: "2024-01-14",
    status: "Pending",
    amount: 8420.00
  },
  {
    id: "C3-2024-003",
    employerName: "DEF Corporation",
    period: "2024-01", 
    dateSubmitted: "2024-01-13",
    status: "Approved",
    amount: 22300.00
  },
  {
    id: "C3-2024-004",
    employerName: "GHI Services",
    period: "2024-01",
    dateSubmitted: "2024-01-12",
    status: "Rejected",
    amount: 5670.00
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
      case "Approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
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

      {/* C3 Summary Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total C3 Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,257</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">56</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved C3s</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">1,178</div>
            <p className="text-xs text-muted-foreground">93.7% of total records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected C3s</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">23</div>
            <p className="text-xs text-muted-foreground">1.8% rejection rate</p>
          </CardContent>
        </Card>
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
          <CardTitle>Recent C3 Entries</CardTitle>
          <CardDescription>Latest C3 records submitted to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>C3 ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentC3Entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.id}</TableCell>
                    <TableCell>{entry.employerName}</TableCell>
                    <TableCell>{entry.period}</TableCell>
                    <TableCell>{entry.dateSubmitted}</TableCell>
                    <TableCell>${entry.amount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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