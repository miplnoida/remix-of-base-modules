import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Plus, Search, Eye, MapPin, Calendar, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockInspections = [
  { id: 'INS-2026-00056', employer: 'Caribbean Hotel Group', regNo: 'R-10234', type: 'Routine Inspection', status: 'Completed', inspector: 'J. Williams', scheduledDate: '2026-03-05', location: 'Basseterre', findings: 3 },
  { id: 'INS-2026-00057', employer: 'Island Construction Ltd', regNo: 'R-10567', type: 'Follow-up Visit', status: 'In Progress', inspector: 'M. Charles', scheduledDate: '2026-03-09', location: 'Frigate Bay', findings: 0 },
  { id: 'INS-2026-00058', employer: 'Nevis Auto Parts', regNo: 'R-10892', type: 'Wage Book Review', status: 'Scheduled', inspector: 'S. Thomas', scheduledDate: '2026-03-10', location: 'Charlestown', findings: 0 },
  { id: 'INS-2026-00059', employer: 'KN Shipping Services', regNo: 'R-11023', type: 'Complaint Investigation', status: 'Scheduled', inspector: 'J. Williams', scheduledDate: '2026-03-12', location: 'Bird Rock', findings: 0 },
  { id: 'INS-2026-00060', employer: 'Palm View Resort', regNo: 'R-10456', type: 'Routine Inspection', status: 'Overdue', inspector: 'M. Charles', scheduledDate: '2026-03-01', location: 'Frigate Bay', findings: 0 },
  { id: 'INS-2026-00055', employer: 'Sandy Point Bakery', regNo: 'R-10789', type: 'Scouting Visit', status: 'Completed', inspector: 'S. Thomas', scheduledDate: '2026-02-28', location: 'Sandy Point', findings: 1 },
];

const InspectionManagement = () => {
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = statusFilter === 'All' ? mockInspections : mockInspections.filter(i => i.status === statusFilter);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Inspection Management</h1>
          </div>
          <p className="text-muted-foreground">Schedule, assign, and track field compliance inspections</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Schedule Inspection</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['All', 'Scheduled', 'In Progress', 'Completed', 'Overdue'].map(s => (
          <Card key={s} className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === s ? 'ring-2 ring-primary' : ''}`} onClick={() => setStatusFilter(s)}>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">{s}</p>
              <p className="text-xl font-bold text-foreground">{s === 'All' ? mockInspections.length : mockInspections.filter(i => i.status === s).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Inspection</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employer</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Inspector</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Location</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Findings</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ins => (
                  <tr key={ins.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                    <td className="py-2 px-3 font-mono text-xs font-medium text-foreground">{ins.id}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{ins.employer}</p>
                      <p className="text-xs text-muted-foreground font-mono">{ins.regNo}</p>
                    </td>
                    <td className="py-2 px-3 text-foreground">{ins.type}</td>
                    <td className="py-2 px-3 text-foreground">{ins.inspector}</td>
                    <td className="py-2 px-3 text-foreground">{ins.scheduledDate}</td>
                    <td className="py-2 px-3 text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{ins.location}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={ins.status === 'Completed' ? 'default' : ins.status === 'Overdue' ? 'destructive' : ins.status === 'In Progress' ? 'secondary' : 'outline'} className="text-[10px]">
                        {ins.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">{ins.findings > 0 ? ins.findings : '—'}</td>
                    <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InspectionManagement;
