import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hash, Plus, Edit, Trash2, CheckCircle, Eye } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const sampleTemplates = [
  { id: 'NT-001', name: 'Violation Number', entityType: 'violation', pattern: 'VIO-{YYYY}-{NNNNN}', example: 'VIO-2026-00001', currentSequence: 142, isActive: true, resetFrequency: 'Yearly' },
  { id: 'NT-002', name: 'Case Number', entityType: 'case', pattern: 'CASE-{YYYY}-{NNNNN}', example: 'CASE-2026-00001', currentSequence: 89, isActive: true, resetFrequency: 'Yearly' },
  { id: 'NT-003', name: 'Inspection Number', entityType: 'inspection', pattern: 'INS-{YYYY}-{NNNNN}', example: 'INS-2026-00001', currentSequence: 60, isActive: true, resetFrequency: 'Yearly' },
  { id: 'NT-004', name: 'Notice Number', entityType: 'notice', pattern: 'NOT-{YYYY}-{MM}-{NNNNN}', example: 'NOT-2026-03-00001', currentSequence: 234, isActive: true, resetFrequency: 'Monthly' },
  { id: 'NT-005', name: 'Legal Case Number', entityType: 'legal', pattern: 'LGL-{YYYY}-{NNNNN}', example: 'LGL-2026-00001', currentSequence: 41, isActive: true, resetFrequency: 'Yearly' },
  { id: 'NT-006', name: 'Waiver Number', entityType: 'waiver', pattern: 'WVR-{YYYY}-{NNNNN}', example: 'WVR-2026-00001', currentSequence: 12, isActive: true, resetFrequency: 'Yearly' },
  { id: 'NT-007', name: 'Simple Sequential (Legacy)', entityType: 'violation', pattern: 'NNNNN', example: '00001', currentSequence: 0, isActive: false, resetFrequency: 'Never' },
];

const NumberTemplates = () => {
  const [preview, setPreview] = useState('');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Number Templates</h1>
          </div>
          <p className="text-muted-foreground">Configure number generation templates for violations, cases, inspections, and notices</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Template</Button>
      </div>

      {/* Template Variables Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Variables</CardTitle>
          <CardDescription>Use these placeholders in your template patterns. The system will auto-generate unique numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{YYYY}'} = Year (e.g. 2026)</Badge>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{MM}'} = Month (e.g. 03)</Badge>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{NNNNN}'} = Sequential padded (e.g. 00142)</Badge>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">NNNNN = Sequential only</Badge>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{TERRITORY}'} = SK or NV</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <div className="space-y-3">
        {sampleTemplates.map((tmpl) => (
          <Card key={tmpl.id} className={`hover:shadow-sm transition-shadow ${!tmpl.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{tmpl.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{tmpl.entityType}</Badge>
                      <Badge variant="outline" className="text-[10px]">Reset: {tmpl.resetFrequency}</Badge>
                      {tmpl.isActive && <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground">Pattern: <span className="font-mono text-foreground">{tmpl.pattern}</span></span>
                      <span className="text-sm text-muted-foreground">Preview: <span className="font-mono font-medium text-primary">{tmpl.example}</span></span>
                      <span className="text-sm text-muted-foreground">Current: <span className="font-medium text-foreground">{tmpl.currentSequence}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Switch checked={tmpl.isActive} />
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NumberTemplates;
