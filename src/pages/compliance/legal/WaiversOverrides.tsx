import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

const WaiversOverrides = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Waivers & Overrides</h1>
          </div>
          <p className="text-muted-foreground">
            Manage waiver requests, penalty overrides, and exception approvals
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Waiver Request
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">Waivers will populate once database tables are created</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaiversOverrides;
