
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const FinancialView = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">$12.5M</div>
            <p className="text-sm text-gray-600">Monthly Contributions</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">$8.2M</div>
            <p className="text-sm text-gray-600">Benefits Paid</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">$4.3M</div>
            <p className="text-sm text-gray-600">Net Surplus</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
