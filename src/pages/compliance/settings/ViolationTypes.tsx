import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const violationTypeSeeds = [
  { code: 'LATE_FILING', name: 'Late Filing', category: 'filing', severity: 'Medium' },
  { code: 'NON_FILING', name: 'Non Filing', category: 'filing', severity: 'High' },
  { code: 'PARTIAL_PAYMENT', name: 'Partial Payment', category: 'payment', severity: 'Medium' },
  { code: 'NON_PAYMENT', name: 'Non Payment', category: 'payment', severity: 'High' },
  { code: 'UNDER_DECLARATION', name: 'Under Declaration', category: 'declaration', severity: 'High' },
  { code: 'LEVY_SEVERANCE_OMISSION', name: 'Levy/Severance Omission', category: 'declaration', severity: 'Medium' },
  { code: 'REPEAT_DEFAULT', name: 'Repeat Default', category: 'legal', severity: 'Critical' },
  { code: 'ARRANGEMENT_DEFAULT', name: 'Arrangement Default', category: 'legal', severity: 'High' },
  { code: 'LEGAL_DEFAULT', name: 'Legal Default', category: 'legal', severity: 'Critical' },
];

const ViolationTypes = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Violation Types</h1>
          </div>
          <p className="text-muted-foreground">
            Configure violation type definitions used across the compliance module
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Violation Type
        </Button>
      </div>

      <div className="grid gap-3">
        {violationTypeSeeds.map((vt) => (
          <Card key={vt.code}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="font-mono text-xs">{vt.code}</Badge>
                <div>
                  <p className="font-medium text-foreground">{vt.name}</p>
                  <p className="text-xs text-muted-foreground">Category: {vt.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={
                  vt.severity === 'Critical' ? 'destructive' :
                  vt.severity === 'High' ? 'default' : 'secondary'
                }>
                  {vt.severity}
                </Badge>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        These are placeholder definitions. Data will be persisted once database tables are created.
      </p>
    </div>
  );
};

export default ViolationTypes;
