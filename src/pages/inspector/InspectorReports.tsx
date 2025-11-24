import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, Plus } from 'lucide-react';

export const InspectorReports = () => {
  const reports = [
    {
      id: '1',
      title: 'Weekly Activity Report',
      period: 'Jan 8-14, 2024',
      status: 'submitted',
      date: '2024-01-15'
    },
    {
      id: '2',
      title: 'Monthly Inspection Summary',
      period: 'December 2023',
      status: 'approved',
      date: '2024-01-05'
    },
    {
      id: '3',
      title: 'Weekly Activity Report',
      period: 'Jan 1-7, 2024',
      status: 'draft',
      date: '2024-01-08'
    }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'default';
      case 'submitted': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">Reports</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Generate
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4" />
            My Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.map((report) => (
            <Card key={report.id} className="border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{report.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      {report.period}
                    </div>
                  </div>
                  <Badge variant={getStatusColor(report.status)} className="text-xs ml-2 flex-shrink-0">
                    {report.status}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs h-8">
                    View
                  </Button>
                  <Button variant="outline" className="text-xs h-8 px-3">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start text-sm h-10">
            <FileText className="h-4 w-4 mr-2" />
            Weekly Activity Report
          </Button>
          <Button variant="outline" className="w-full justify-start text-sm h-10">
            <FileText className="h-4 w-4 mr-2" />
            Monthly Summary Report
          </Button>
          <Button variant="outline" className="w-full justify-start text-sm h-10">
            <FileText className="h-4 w-4 mr-2" />
            Violation Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
