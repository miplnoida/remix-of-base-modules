import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  BarChart3,
  List,
  UserPlus,
  CheckCircle,
  Clock,
  TrendingUp,
  IdCard,
  AlertTriangle,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Shield
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

  // ID Card Status Statistics - mock data
  const idCardStats = [
    { label: 'Active ID Cards', value: '10,892', icon: IdCard, color: 'from-green-500 to-green-600', description: 'Valid and active cards' },
    { label: 'Expiring Soon', value: '234', icon: AlertTriangle, color: 'from-orange-500 to-orange-600', description: 'Expiring in next 30 days' },
    { label: 'Expired Cards', value: '67', icon: Calendar, color: 'from-red-500 to-red-600', description: 'Require renewal' },
    { label: 'Pending Generation', value: '89', icon: CreditCard, color: 'from-blue-500 to-blue-600', description: 'Cards to be generated' },
  ];

  const recentActivities = [
    { action: 'New Registration', person: 'John Doe', time: '2 hours ago', status: 'Completed' },
    { action: 'Status Update', person: 'Jane Smith', time: '4 hours ago', status: 'Active' },
    { action: 'Document Verification', person: 'Mike Johnson', time: '6 hours ago', status: 'Verified' },
    { action: 'Profile Edit', person: 'Sarah Wilson', time: '1 day ago', status: 'Updated' },
  ];

  const handleQuickAction = (action: string) => {
    console.log(`${action} clicked`);
    switch (action) {
      case 'Pending Reviews':
        navigate('/person/pending-reviews');
        break;
      case 'View Wages History':
        navigate('/person/wages-history');
        break;
      case 'View Claim History':
        navigate('/person/claim-history');
        break;
      case 'Check Benefit Eligibilities':
        navigate('/person/benefit-eligibility');
        break;
      default:
        console.log(`Action not handled: ${action}`);
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
            
          </div>
      {/* Dashboard Content */}
      <div className="space-y-4 lg:space-y-6">
        {/* Main Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {dashboardStats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground" style={{color:"#374151"}}>{stat.label}</CardTitle>
                <div className={`p-2.5 rounded bg-gradient-to-r ${stat.color} shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</div>
                <p className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-primary' : 'text-destructive'}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ID Card Status Section */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {idCardStats.map((stat, index) => (
              <Card key={index} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-secondary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-sm font-medium text-muted-foreground" style={{color:"#374151"}}>{stat.label}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">{stat.description}</CardDescription>
                  </div>
                  <div className={`p-2.5 rounded bg-gradient-to-r ${stat.color} shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activities and Quick Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used actions for IP management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-16 lg:h-20 flex flex-col gap-2"
                  onClick={() => navigate('/person/register-tabs')}
                >
                  <UserPlus className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Register Person</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 lg:h-20 flex flex-col gap-2"
                  onClick={() => handleQuickAction('Pending Reviews')}
                >
                  <Clock className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Pending Verification</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 lg:h-20 flex flex-col gap-2"
                  onClick={() => handleQuickAction('View Wages History')}
                >
                  <DollarSign className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Wages History</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 lg:h-20 flex flex-col gap-2"
                  onClick={() => handleQuickAction('View Claim History')}
                >
                  <FileText className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Claim History</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 lg:h-20 flex flex-col gap-2"
                  onClick={() => handleQuickAction('Check Benefit Eligibilities')}
                >
                  <Shield className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">Benefit Eligibility</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 lg:h-20 flex flex-col gap-2"
                  onClick={() => navigate('/person/ip-management')}
                >
                  <List className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="text-xs lg:text-sm">View All</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest actions performed on insured person records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4" style={{color:"#16a249"}} />
            </div>
                    <div  className="flex-1">
                      <p className="font-medium text-sm lg:text-base">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.person}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-primary font-medium">{activity.status}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                          variant='outline'  
                            className="flex items-center gap-2 w-full my-5"
                          >
                           
                            View all Activies
                          </Button>
            </CardContent>
          </Card>

          
        </div>
      </div>
    </div>
  );
};

export default IPManagement;
