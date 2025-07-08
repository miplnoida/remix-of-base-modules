
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  ArrowLeft,
  Home,
  BarChart3,
  List,
  UserPlus,
  CheckCircle,
  Clock,
  User,
  TrendingUp
} from 'lucide-react';
import { IPListing } from '@/components/ip/IPListing';
import { IPRegistration } from '@/components/ip/IPRegistration';

const IPManagement = () => {
  const navigate = useNavigate();

  // Dashboard statistics - mock data
  const dashboardStats = [
    { label: 'Total Insured Persons', value: '12,456', icon: Users, color: 'from-blue-500 to-blue-600', change: '+8.2%' },
    { label: 'Active Registrations', value: '11,234', icon: CheckCircle, color: 'from-green-500 to-green-600', change: '+5.1%' },
    { label: 'Pending Applications', value: '45', icon: Clock, color: 'from-yellow-500 to-yellow-600', change: '-12%' },
    { label: 'New This Month', value: '156', icon: TrendingUp, color: 'from-purple-500 to-purple-600', change: '+23%' },
  ];

  const recentActivities = [
    { action: 'New Registration', person: 'John Doe', time: '2 hours ago', status: 'Completed' },
    { action: 'Status Update', person: 'Jane Smith', time: '4 hours ago', status: 'Active' },
    { action: 'Document Verification', person: 'Mike Johnson', time: '6 hours ago', status: 'Verified' },
    { action: 'Profile Edit', person: 'Sarah Wilson', time: '1 day ago', status: 'Updated' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Insured Person Management</h1>
            <p className="text-gray-600">Manage all insured person registrations and records</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Main Menu
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button 
          onClick={() => navigate('/')}
          className="hover:text-gray-700 transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-gray-900">Insured Person Management</span>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="listing" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            IP Listing
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Register Person
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardStats.map((stat, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{stat.label}</CardTitle>
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <p className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest actions performed on insured person records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.person}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-600 font-medium">{activity.status}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used actions for IP management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button className="h-20 flex flex-col gap-2">
                    <UserPlus className="h-6 w-6" />
                    <span className="text-sm">New Registration</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <List className="h-6 w-6" />
                    <span className="text-sm">View All</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-sm">Pending Reviews</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <User className="h-6 w-6" />
                    <span className="text-sm">ID Cards</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* IP Listing Tab */}
        <TabsContent value="listing">
          <IPListing />
        </TabsContent>

        {/* Register Person Tab */}
        <TabsContent value="register">
          <IPRegistration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IPManagement;
