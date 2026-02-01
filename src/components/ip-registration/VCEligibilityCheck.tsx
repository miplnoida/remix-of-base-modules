import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  UserPlus,
  Calendar,
  DollarSign,
  Clock
} from 'lucide-react';
import { useCheckVCEligibility, useVCRecord, useCeaseVC } from '@/hooks/useVoluntaryContributor';
import { VCRegistrationDialog } from './VCRegistrationDialog';
import { formatDisplayDate } from '@/lib/dateFormat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VCEligibilityCheckProps {
  ssn: string;
  personName?: string;
}

export function VCEligibilityCheck({ ssn, personName }: VCEligibilityCheckProps) {
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showCeaseDialog, setShowCeaseDialog] = useState(false);
  
  const { data: eligibility, isLoading: eligibilityLoading, refetch } = useCheckVCEligibility(ssn);
  const { data: vcRecord, isLoading: vcLoading } = useVCRecord(ssn);
  const ceaseVC = useCeaseVC();

  const isLoading = eligibilityLoading || vcLoading;
  const isActiveVC = vcRecord && !vcRecord.date_ceased;
  const isCeasedVC = vcRecord && vcRecord.date_ceased;

  const handleCease = async () => {
    await ceaseVC.mutateAsync({ ssn, reason: 'MANUAL' });
    setShowCeaseDialog(false);
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Active Voluntary Contributor - Show status card
  if (isActiveVC) {
    return (
      <Card className="border-green-500/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Active Voluntary Contributor
            </CardTitle>
            <Badge variant="default" className="bg-green-600">Active</Badge>
          </div>
          <CardDescription>
            Registered since {formatDisplayDate(vcRecord.date_registered)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Commencement</p>
                <p className="font-medium">{formatDisplayDate(vcRecord.date_commenced)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Contribution</p>
                <p className="font-medium">${vcRecord.contrib_amt?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Interval</p>
                <p className="font-medium">{vcRecord.payment_interval === 'W' ? 'Weekly' : 'Monthly'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Next Due</p>
                <p className="font-medium">{formatDisplayDate(vcRecord.due_date)}</p>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Average Weekly Wage: <span className="font-medium">${vcRecord.avg_weekly_wage?.toFixed(2) || '0.00'}</span>
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:text-destructive"
              onClick={() => setShowCeaseDialog(true)}
            >
              Cease Voluntary Contribution
            </Button>
          </div>
        </CardContent>

        <AlertDialog open={showCeaseDialog} onOpenChange={setShowCeaseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cease Voluntary Contributor Status</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cease voluntary contributor status for this person? 
                This action cannot be undone and no new payments can be recorded after cessation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCease}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {ceaseVC.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Cease Status
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  // Ceased VC - Show historical info
  if (isCeasedVC) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-5 w-5" />
              Former Voluntary Contributor
            </CardTitle>
            <Badge variant="secondary">Ceased</Badge>
          </div>
          <CardDescription>
            Status ceased on {formatDisplayDate(vcRecord.date_ceased)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This person was previously registered as a voluntary contributor from{' '}
            {formatDisplayDate(vcRecord.date_registered)} to {formatDisplayDate(vcRecord.date_ceased)}.
          </p>
          
          {eligibility?.eligible && (
            <div className="mt-4">
              <Button onClick={() => setShowRegistrationDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Re-register as Voluntary Contributor
              </Button>
            </div>
          )}
        </CardContent>

        {eligibility && showRegistrationDialog && (
          <VCRegistrationDialog
            open={showRegistrationDialog}
            onOpenChange={setShowRegistrationDialog}
            ssn={ssn}
            eligibilityData={eligibility}
            onSuccess={() => refetch()}
          />
        )}
      </Card>
    );
  }

  // Eligibility Check - Not yet registered
  if (!eligibility) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Unable to check eligibility. Please try again.
        </CardContent>
      </Card>
    );
  }

  // Eligible - Show registration option
  if (eligibility.eligible) {
    return (
      <>
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                Eligible for Voluntary Contribution
              </CardTitle>
              <Badge variant="default">Eligible</Badge>
            </div>
            <CardDescription>
              This person meets all eligibility requirements for voluntary contributor registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Age:</span>
                <span className="ml-2 font-medium">{eligibility.ip_details?.age} years</span>
              </div>
              <div>
                <span className="text-muted-foreground">Residence:</span>
                <span className="ml-2 font-medium">{eligibility.ip_details?.place_of_residence}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contribution Rate:</span>
                <span className="ml-2 font-medium">{eligibility.config?.contrib_pct}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Grace Period:</span>
                <span className="ml-2 font-medium">{eligibility.config?.termination_grace_weeks} weeks</span>
              </div>
            </div>
            
            <Button onClick={() => setShowRegistrationDialog(true)} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Register as Voluntary Contributor
            </Button>
          </CardContent>
        </Card>

        <VCRegistrationDialog
          open={showRegistrationDialog}
          onOpenChange={setShowRegistrationDialog}
          ssn={ssn}
          eligibilityData={eligibility}
          onSuccess={() => refetch()}
        />
      </>
    );
  }

  // Not Eligible - Show reasons
  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Not Eligible for Voluntary Contribution
          </CardTitle>
          <Badge variant="destructive">Ineligible</Badge>
        </div>
        <CardDescription>
          This person does not meet the eligibility requirements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {eligibility.errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-medium">{error.code}</AlertTitle>
              <AlertDescription className="text-sm">{error.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
