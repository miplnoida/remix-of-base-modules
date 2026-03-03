
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, FileText, Shield } from 'lucide-react';

export const HRView = () => {
  const hrStats = [
    { label: 'Total Employees', value: '1.2M', icon: Users, color: 'bg-success' },
    { label: 'New Registrations', value: '156', icon: Building2, color: 'bg-info' },
    { label: 'Pending Applications', value: '45', icon: FileText, color: 'bg-warning' },
    { label: 'ID Cards Generated', value: '89', icon: Shield, color: 'bg-primary' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {hrStats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            <div className={`p-2 rounded ${stat.color}`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
