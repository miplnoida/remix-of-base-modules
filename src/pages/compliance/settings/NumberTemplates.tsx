import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hash, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const sampleTemplates = [
  { name: 'Simple Sequential', pattern: 'NNNNN', example: '00001', appliesTo: 'violation' },
  { name: 'Prefixed Sequential', pattern: 'VIO-NNNNN', example: 'VIO-00001', appliesTo: 'violation' },
  { name: 'Year-Based', pattern: 'COMP-{YYYY}-{NNNNN}', example: 'COMP-2026-00001', appliesTo: 'violation' },
  { name: 'Case Number', pattern: 'CASE-{YYYY}-{NNNNN}', example: 'CASE-2026-00001', appliesTo: 'case' },
  { name: 'Inspection Number', pattern: 'INS-{YYYY}-{NNNNN}', example: 'INS-2026-00001', appliesTo: 'inspection' },
  { name: 'Notice Number', pattern: 'NOT-{YYYY}-{NNNNN}', example: 'NOT-2026-00001', appliesTo: 'notice' },
];

const NumberTemplates = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Number Templates</h1>
          </div>
          <p className="text-muted-foreground">
            Configure number generation templates for violations, cases, inspections, and notices
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Variables</CardTitle>
          <CardDescription>
            Use these placeholders in your template patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="font-mono">{'{YYYY}'} = Year</Badge>
            <Badge variant="outline" className="font-mono">{'{MM}'} = Month</Badge>
            <Badge variant="outline" className="font-mono">{'{NNNNN}'} = Sequential (padded)</Badge>
            <Badge variant="outline" className="font-mono">NNNNN = Sequential only</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {sampleTemplates.map((tmpl, idx) => (
          <Card key={idx}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-foreground">{tmpl.name}</p>
                  <p className="text-sm font-mono text-muted-foreground">{tmpl.pattern}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{tmpl.appliesTo}</Badge>
                <div className="text-sm text-muted-foreground">
                  Preview: <span className="font-mono font-medium text-foreground">{tmpl.example}</span>
                </div>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        These are placeholder templates. Data will be persisted once database tables are created.
      </p>
    </div>
  );
};

export default NumberTemplates;
