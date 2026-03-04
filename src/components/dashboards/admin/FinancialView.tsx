
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
            <div className="text-2xl font-bold text-success">$12.5M</div>
            <p className="text-sm text-muted-foreground">Monthly Contributions</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-info">$8.2M</div>
            <p className="text-sm text-muted-foreground">Benefits Paid</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-foreground">$4.3M</div>
            <p className="text-sm text-muted-foreground">Net Surplus</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
