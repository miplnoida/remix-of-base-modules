import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel } from 'lucide-react';

const LegalProceedingsPage = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Legal Proceedings</h1>
        </div>
        <p className="text-muted-foreground">
          Active legal cases, court proceedings, and enforcement tracking
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">Legal proceedings will populate once database tables are created</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalProceedingsPage;
