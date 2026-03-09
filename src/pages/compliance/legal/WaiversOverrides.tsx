import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Eye, Clock, CheckCircle, XCircle, Building2, DollarSign } from 'lucide-react';

const mockWaivers = [
  { id: 'WVR-2026-00012', employer: 'Caribbean Hotel Group', regNo: 'R-10234', type: 'Penalty Waiver', amountRequested: '$4,500', status: 'Pending Manager Review', requestedBy: 'J. Williams', requestedDate: '2026-03-05', justification: 'First-time violation, employer cooperating' },
  { id: 'WVR-2026-00011', employer: 'Nevis Traders Ltd', regNo: 'R-10892', type: 'Interest Waiver', amountRequested: '$1,200', status: 'Pending Legal Review', requestedBy: 'S. Thomas', requestedDate: '2026-03-01', justification: 'Hardship — hurricane damage' },
  { id: 'WVR-2026-00010', employer: 'Sandy Point Bakery', regNo: 'R-10789', type: 'Full Waiver', amountRequested: '$8,900', status: 'Pending Director Approval', requestedBy: 'M. Charles', requestedDate: '2026-02-25', justification: 'Business closure, owner deceased' },
  { id: 'WVR-2026-00009', employer: 'Tropical Traders Inc', regNo: 'R-11245', type: 'Penalty Waiver', amountRequested: '$2,100', status: 'Approved', requestedBy: 'J. Williams', requestedDate: '2026-02-15', justification: 'Late filing due to system outage' },
  { id: 'WVR-2026-00008', employer: 'KN Auto Services', regNo: 'R-11023', type: 'Interest Waiver', amountRequested: '$6,300', status: 'Rejected', requestedBy: 'S. Thomas', requestedDate: '2026-02-10', justification: 'Repeat offender — insufficient grounds' },
];

const statusIcon = (status: string) => {
  if (status === 'Approved') return <CheckCircle className="h-3.5 w-3.5 text-success" />;
  if (status === 'Rejected') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-warning" />;
};

const statusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (status === 'Approved') return 'default';
  if (status === 'Rejected') return 'destructive';
  return 'secondary';
};

const WaiversOverrides = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Waivers & Overrides</h1>
          </div>
          <p className="text-muted-foreground">Manage waiver requests, penalty overrides, and exception approvals</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Waiver Request</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Requests</p><p className="text-2xl font-bold text-foreground">{mockWaivers.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{mockWaivers.filter(w => w.status.startsWith('Pending')).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-success">{mockWaivers.filter(w => w.status === 'Approved').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{mockWaivers.filter(w => w.status === 'Rejected').length}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {mockWaivers.map(w => (
          <Card key={w.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-foreground">{w.id}</span>
                    <Badge variant="outline" className="text-[10px]">{w.type}</Badge>
                    <Badge variant={statusVariant(w.status)} className="text-[10px] flex items-center gap-1">
                      {statusIcon(w.status)} {w.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{w.employer}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{w.regNo}</Badge>
                    <span className="font-medium text-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" />{w.amountRequested}</span>
                  </div>
                  <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Justification:</span> {w.justification}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Requested by: {w.requestedBy}</span>
                    <span>Date: {w.requestedDate}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="ml-4"><Eye className="h-4 w-4 mr-1" />Review</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WaiversOverrides;
