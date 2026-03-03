
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
          <div className="space-y-4"><p className="text-muted-foreground text-center py-20">
                <svg className='mx-auto' width="46" height="52" viewBox="0 0 46 52" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M22.4689 32.5216L22.5697 32.5242L22.6523 32.5139C23.0192 32.4648 24.4916 32.1652 24.5071 30.5945C24.5072 30.522 24.5106 30.4496 24.5175 30.3775C25.569 30.0516 26.5218 29.4667 27.2883 28.6765C28.0548 27.8863 28.6104 26.9162 28.9041 25.8552C29.1978 24.7942 29.2202 23.6764 28.9691 22.6046C28.7181 21.5327 28.2017 20.5411 27.4674 19.7209C26.7332 18.9006 25.8045 18.2781 24.7669 17.9104C23.7292 17.5427 22.6158 17.4417 21.5289 17.6167C20.442 17.7916 19.4165 18.2369 18.5466 18.9116C17.6767 19.5863 16.9904 20.4688 16.5505 21.478C16.4425 21.712 16.3822 21.9652 16.3732 22.2228C16.3643 22.4804 16.4068 22.7371 16.4983 22.9781C16.5898 23.219 16.7284 23.4393 16.9061 23.626C17.0838 23.8127 17.297 23.962 17.5331 24.0653C17.7692 24.1686 18.0236 24.2238 18.2813 24.2275C18.539 24.2313 18.7949 24.1836 19.0339 24.0872C19.273 23.9908 19.4904 23.8478 19.6735 23.6663C19.8565 23.4849 20.0015 23.2687 20.1 23.0306C20.3484 22.4649 20.7836 22.0018 21.3327 21.7188C21.8818 21.4357 22.5115 21.35 23.1163 21.4759C23.7211 21.6019 24.2643 21.9318 24.6548 22.4105C25.0453 22.8891 25.2595 23.4875 25.2615 24.1052C25.2615 25.3504 24.4141 26.3992 23.2646 26.7066C22.5645 26.8508 21.9322 27.2237 21.4673 27.7667C21.0024 28.3097 20.7314 28.9919 20.6968 29.7058C20.6373 30.1243 20.6322 30.5583 20.6322 30.5583V30.5867C20.6322 31.0832 20.8227 31.5607 21.1645 31.9207C21.5062 32.2807 21.9732 32.4958 22.4689 32.5216Z" fill="#D6D6D6"/>
<path d="M22.5693 37.5605C23.0832 37.5605 23.576 37.3564 23.9393 36.993C24.3027 36.6297 24.5068 36.1369 24.5068 35.623C24.5068 35.1092 24.3027 34.6164 23.9393 34.253C23.576 33.8897 23.0832 33.6855 22.5693 33.6855C22.0555 33.6855 21.5627 33.8897 21.1993 34.253C20.836 34.6164 20.6318 35.1092 20.6318 35.623C20.6318 36.1369 20.836 36.6297 21.1993 36.993C21.5627 37.3564 22.0555 37.5605 22.5693 37.5605Z" fill="#D6D6D6"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M45.373 17.7411C45.373 15.8578 44.6238 14.0521 43.2934 12.7191L33.4019 2.82761C32.0694 1.49659 30.2633 0.748673 28.3799 0.748047H12.4358C9.18136 0.748047 6.06026 2.04085 3.75905 4.34206C1.45784 6.64326 0.165039 9.76437 0.165039 13.0188V38.8519C0.165039 42.1063 1.45784 45.2274 3.75905 47.5286C6.06026 49.8298 9.18136 51.1226 12.4358 51.1226H33.1022C36.3566 51.1226 39.4777 49.8298 41.7789 47.5286C44.0801 45.2274 45.373 42.1063 45.373 38.8519V17.7411ZM28.5814 4.62818L28.3799 4.62301H12.4358C11.3329 4.62199 10.2407 4.83846 9.22164 5.26002C8.20256 5.68159 7.27661 6.29998 6.49679 7.0798C5.71697 7.85962 5.09858 8.78556 4.67702 9.80464C4.25545 10.8237 4.03898 11.9159 4.04 13.0188V38.8519C4.04 41.0786 4.92455 43.214 6.49906 44.7886C8.07357 46.3631 10.2091 47.2476 12.4358 47.2476H33.1022C35.3289 47.2476 37.4644 46.3631 39.0389 44.7886C40.6134 43.214 41.498 41.0786 41.498 38.8519V17.7411L41.4928 17.5396H35.6855C33.8023 17.5396 31.994 16.7904 30.661 15.46C29.3301 14.1264 28.5822 12.3195 28.5814 10.4355V4.62818ZM38.7571 13.6646L32.4564 7.3639V10.4355C32.4578 11.2915 32.7984 12.112 33.4037 12.7173C34.009 13.3226 34.8295 13.6632 35.6855 13.6646H38.7571Z" fill="#D6D6D6"/>
</svg>
<br/>
                No CARICOM added yet</p></div>
          {/* Status Overview */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </Card>*/}
        </CardContent>
      </Card>
    </div>
  );
};
