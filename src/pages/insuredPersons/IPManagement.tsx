import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import './IPManagement.css';
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
  Shield,
  MoreHorizontal
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
    { action: 'Status Update', person: 'Jane Smith', time: '4 hours ago', status: 'Verified' },
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
    <div className="ip-dashboard">
      {/* Main Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* Dashboard Title */}
        <div className="mb-6">
          <h1 className="dashboard-title">Dashboard</h1>
        </div>

        {/* Main Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, index) => (
            <Card key={index} className="stat-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="stat-label">{stat.label}</CardTitle>
                <div className={`p-2.5 stat-icon bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="stat-value mb-1">{stat.value}</div>
                <p className={`stat-change ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ID Card Status Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {idCardStats.map((stat, index) => (
            <Card key={index} className="stat-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex-1">
                  <CardTitle className="stat-label">{stat.label}</CardTitle>
                  <CardDescription className="stat-description mt-1">{stat.description}</CardDescription>
                </div>
                <div className={`p-2.5 stat-icon bg-gradient-to-r ${stat.color} ml-3`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="stat-value">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions and Recent Activities */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Quick Actions Panel */}
          <Card className="panel-card">
            <CardHeader className="pb-4">
              <CardTitle className="panel-title">Quick Actions</CardTitle>
              <CardDescription className="panel-description">Frequently used actions for IP management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  className="quick-action-button primary"
                  onClick={() => navigate('/person/register-tabs')}
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Register Person</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="quick-action-button secondary"
                  onClick={() => handleQuickAction('Pending Reviews')}
                >
                  <Clock className="h-5 w-5" />
                  <span>Pending Reviews</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="quick-action-button secondary"
                  onClick={() => handleQuickAction('View Wages History')}
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Wages History</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="quick-action-button secondary"
                  onClick={() => handleQuickAction('View Claim History')}
                >
                  <FileText className="h-5 w-5" />
                  <span>Claim History</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="quick-action-button secondary"
                  onClick={() => handleQuickAction('Check Benefit Eligibilities')}
                >
                  <Shield className="h-5 w-5" />
                  <span>Benefit Eligibility</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="quick-action-button secondary"
                  onClick={() => navigate('/person/ip-management')}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span>View All</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities Panel */}
          <Card className="panel-card">
            <CardHeader className="pb-4">
              <CardTitle className="panel-title">Recent Activities</CardTitle>
              <CardDescription className="panel-description">Latest actions performed on insured person records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="activity-status-dot"></div>
                        <div>
                          <p className="activity-action">{activity.action}</p>
                          <p className="activity-person">{activity.person}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="activity-status">{activity.status}</p>
                        <p className="activity-time">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="view-all-button"
                  >
                    View all Activities
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IPManagement;
