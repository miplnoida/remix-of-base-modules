import { ShieldAlert, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSecurityPolicy } from '@/contexts/SecurityPolicyContext';

const Maintenance = () => {
  const { lockdownState } = useSecurityPolicy();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/10">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Application Temporarily Unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The application has been placed in lockdown mode due to detected security threats.
          </p>
          {lockdownState?.locked_reason && (
            <div className="bg-muted p-3 rounded-md text-sm text-left">
              <div className="flex items-center gap-2 mb-1 font-medium">
                <Lock className="h-4 w-4" />
                Reason
              </div>
              <p className="text-muted-foreground">{lockdownState.locked_reason}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Please contact your system administrator for assistance. 
            Admin users can access the emergency recovery panel to restore access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Maintenance;
