
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const BenefitsDashboard = () => {
  const benefitsStats = [
    { label: 'Total Claims', value: '8,456', change: '+12%', icon: Heart, color: 'text-blue-600' },
    { label: 'Approved Benefits', value: '$2.4M', change: '+8%', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Claims', value: '342', change: '-5%', icon: Clock, color: 'text-orange-600' },
    { label: 'Rejected Claims', value: '89', change: '-15%', icon: XCircle, color: 'text-red-600' },
  ];

  const recentClaims = [
    { id: 'CLM-2024-001', beneficiary: 'John Doe', type: 'Medical', amount: '$2,500', status: 'Pending', date: '2024-01-10' },
    { id: 'CLM-2024-002', beneficiary: 'Jane Smith', type: 'Pension', amount: '$1,800', status: 'Approved', date: '2024-01-09' },
    { id: 'CLM-2024-003', beneficiary: 'Mike Johnson', type: 'Disability', amount: '$3,200', status: 'Under Review', date: '2024-01-08' },
    { id: 'CLM-2024-004', beneficiary: 'Sarah Wilson', type: 'Medical', amount: '$850', status: 'Approved', date: '2024-01-07' },
  ];

  const benefitTypes = [
    { type: 'Medical Benefits', claims: 156, approved: 142, pending: 14, amount: '$890K' },
    { type: 'Pension Benefits', claims: 89, approved: 85, pending: 4, amount: '$1.2M' },
    { type: 'Disability Benefits', claims: 67, approved: 59, pending: 8, amount: '$340K' },
    { type: 'Family Benefits', claims: 23, approved: 20, pending: 3, amount: '$180K' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Benefits Management Dashboard</h1>
        <p className="text-gray-600">Monitor and manage benefit claims and payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefitsStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                {' '}from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Recent Claims
              </span>
              <Button size="sm">Process New</Button>
            </CardTitle>
            <CardDescription>Latest benefit claims requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentClaims.map((claim, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{claim.id}</h4>
                    <Badge variant={
                      claim.status === 'Approved' ? 'default' :
                      claim.status === 'Pending' ? 'secondary' : 'outline'
                    }>
                      {claim.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{claim.beneficiary}</span>
                    <span className="text-sm font-medium">{claim.amount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{claim.type}</span>
                    <span>{claim.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Benefit Types Overview
            </CardTitle>
            <CardDescription>Claims breakdown by benefit category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {benefitTypes.map((benefit, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{benefit.type}</h4>
                    <span className="text-lg font-bold text-green-600">{benefit.amount}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{benefit.claims}</div>
                      <div className="text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{benefit.approved}</div>
                      <div className="text-gray-500">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-orange-700">{benefit.pending}</div>
                      <div className="text-gray-500">Pending</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Key performance indicators for benefits processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">3.2 days</div>
              <p className="text-sm text-gray-600">Average Processing Time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">94%</div>
              <p className="text-sm text-gray-600">Approval Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">$3.2M</div>
              <p className="text-sm text-gray-600">Monthly Disbursements</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">98.5%</div>
              <p className="text-sm text-gray-600">Accuracy Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
