import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const JobHistory = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Timer className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Job Execution History</h1>
        </div>
        <p className="text-muted-foreground">
          View execution logs and results for all automation jobs
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">Job history will populate once automation jobs are executed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobHistory;
