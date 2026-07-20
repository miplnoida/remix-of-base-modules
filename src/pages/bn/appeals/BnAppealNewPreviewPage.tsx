/**
 * BN Appeals — Staff registration preview (read-only shell).
 *
 * BN-AP-01 Slice 2A §K: distinct route component for /bn/appeals/new.
 * The full seven-step staff registration wizard lands in Slice 2B; while
 * `actions_enabled=false` this route documents the pilot state honestly
 * rather than reusing the dashboard component.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BnModuleRouteGate } from '@/components/bn/access/BnModuleRouteGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ChevronLeft, Eye } from 'lucide-react';

const WIZARD_STEPS = [
  'Source decision lookup',
  'Appellant & representation',
  'Grounds & issues',
  'Evidence',
  'Admissibility & deadlines',
  'Assignment',
  'Review & submit',
];

export default function BnAppealNewPreviewPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_appeals" requiredAction="view">
      {() => <Preview />}
    </BnModuleRouteGate>
  );
}

function Preview() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Benefit Management → Benefit Operations → Appeals &amp; Disputes → New appeal
        </p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/bn/appeals')}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Worklist
        </Button>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Preview only — actions disabled</AlertTitle>
        <AlertDescription>
          The staff registration wizard is delivered in Slice 2B. During internal pilot,
          the seven steps below are documented for review; submission remains disabled.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" /> Planned wizard flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {WIZARD_STEPS.map((step, idx) => (
              <li key={step} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
