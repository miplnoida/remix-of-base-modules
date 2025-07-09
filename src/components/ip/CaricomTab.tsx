
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle, Clock, AlertTriangle, FileText, Users } from 'lucide-react';

export const CaricomTab = () => {
  // Mock CARICOM data
  const caricomData = {
    membershipStatus: 'Eligible',
    caricomId: 'CARICOM-SKN-2024-001234',
    agreementDate: '2024-01-15',
    benefitPortability: 'Active',
    reciprocalCountries: [
      'Antigua and Barbuda',
      'Barbados',
      'Dominica',
      'Grenada',
      'Jamaica',
      'Saint Lucia',
      'Saint Vincent and the Grenadines',
      'Trinidad and Tobago'
    ],
    lastUpdate: '2024-06-30',
    verificationStatus: 'Verified'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            CARICOM Social Security Agreement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Membership Status</p>
                    <p className="text-lg font-semibold">{caricomData.membershipStatus}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">CARICOM ID</p>
                    <p className="text-sm font-semibold">{caricomData.caricomId}</p>
                  </div>
                  <Badge variant="secondary">CARICOM</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Agreement Date</p>
                    <p className="text-lg font-semibold">{caricomData.agreementDate}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Verification Status</p>
                    <p className="text-lg font-semibold">{caricomData.verificationStatus}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Benefit Portability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Benefit Portability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-semibold">Status: {caricomData.benefitPortability}</p>
                  <p className="text-sm text-gray-600">Benefits are portable across CARICOM member states</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-semibold text-blue-900 mb-2">Portable Benefits Include:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Old Age Pension</li>
                  <li>• Invalidity Pension</li>
                  <li>• Survivors' Benefits</li>
                  <li>• Medical Benefits (where applicable)</li>
                  <li>• Maternity Benefits</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Reciprocal Countries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reciprocal Agreement Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {caricomData.reciprocalCountries.map((country, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded border"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium">{country}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-medium">✓ Full reciprocal benefits available</p>
                <p className="text-sm text-green-600">
                  Contributions and benefits are recognized across all listed CARICOM member states
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Required Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>CARICOM Agreement Form</span>
                  </div>
                  <Badge variant="outline">Completed</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Birth Certificate</span>
                  </div>
                  <Badge variant="outline">Verified</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Passport/ID Verification</span>
                  </div>
                  <Badge variant="outline">Verified</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span>Employment History Certificate</span>
                  </div>
                  <Badge variant="destructive">Pending</Badge>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate CARICOM Certificate
                </Button>
                <Button variant="outline">
                  Request Missing Documents
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent CARICOM Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Agreement Verification</p>
                    <p className="text-sm text-gray-600">Status updated to Active</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">Completed</p>
                    <p className="text-sm text-gray-500">06/30/2024</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Document Submission</p>
                    <p className="text-sm text-gray-600">All required documents submitted</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">Processed</p>
                    <p className="text-sm text-gray-500">06/15/2024</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">Initial Application</p>
                    <p className="text-sm text-gray-600">CARICOM membership application submitted</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-600">Submitted</p>
                    <p className="text-sm text-gray-500">01/15/2024</p>
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
