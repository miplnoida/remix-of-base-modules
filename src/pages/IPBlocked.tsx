/**
 * IP Blocked Page
 * Shown when a user's IP is not in the whitelist.
 */

import React from 'react';
import { ShieldX, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface IPBlockedProps {
  ipAddress?: string | null;
}

const IPBlocked: React.FC<IPBlockedProps> = ({ ipAddress }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (ipAddress) {
      navigator.clipboard.writeText(ipAddress);
      setCopied(true);
      toast.success('IP address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          {ipAddress && (
            <div className="bg-muted rounded-lg p-4 flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">Your IP:</span>
              <code className="font-mono text-sm font-semibold text-foreground bg-background px-3 py-1 rounded border">
                {ipAddress}
              </code>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
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
