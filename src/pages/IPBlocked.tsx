/**
 * IP Blocked Page
 * Shown when a user's IP is not in the whitelist.
 */

import React from 'react';
import { ShieldX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const IPBlocked: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl border-destructive/30">
        <CardContent className="pt-10 pb-10 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Your IP address is not authorized to access this application.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact your system administrator to have your IP address added to the whitelist.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IPBlocked;
