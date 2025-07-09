
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export const NPFTab = () => {
  // Mock NPF data
  const npfData = {
    membershipStatus: 'Active',
    membershipNumber: 'NPF-2024-001234',
    joinDate: '2024-01-15',
    contributionStatus: 'Up to Date',
    lastContribution: '2024-06-30',
    totalContributions: '$12,450.00',
    yearsOfService: '5.5',
    benefitEligibility: 'Eligible',
    pensionProjection: '$850.00/month'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            National Provident Fund (NPF) Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Membership Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Membership Status</p>
                    <p className="text-lg font-semibold">{npfData.membershipStatus}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Membership Number</p>
                    <p className="text-lg font-semibold">{npfData.membershipNumber}</p>
                  </div>
                  <Badge variant="secondary">NPF</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Join Date</p>
                    <p className="text-lg font-semibold">{npfData.joinDate}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Years of Service</p>
                    <p className="text-lg font-semibold">{npfData.yearsOfService}</p>
                  </div>
                  <Badge variant="outline">{npfData.yearsOfService} years</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contribution Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contribution Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  {npfData.contributionStatus === 'Up to Date' ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Contribution Status</p>
                    <p className="font-semibold">{npfData.contributionStatus}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Last Contribution</p>
                  <p className="font-semibold">{npfData.lastContribution}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Total Contributions</p>
                  <p className="font-semibold text-green-600">{npfData.totalContributions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefit Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Benefit Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Benefit Eligibility</p>
                    <p className="font-semibold">{npfData.benefitEligibility}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Projected Monthly Pension</p>
                  <p className="font-semibold text-blue-600">{npfData.pensionProjection}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent NPF Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Monthly Contribution</p>
                    <p className="text-sm text-gray-600">June 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+$275.00</p>
                    <p className="text-sm text-gray-500">06/30/2024</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Monthly Contribution</p>
                    <p className="text-sm text-gray-600">May 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+$275.00</p>
                    <p className="text-sm text-gray-500">05/31/2024</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Monthly Contribution</p>
                    <p className="text-sm text-gray-600">April 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+$275.00</p>
                    <p className="text-sm text-gray-500">04/30/2024</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
