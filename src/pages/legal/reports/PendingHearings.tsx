import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle, MapPin } from 'lucide-react';

export default function PendingHearings() {
  const hearingsData = {
    upcomingTotal: 42,
    thisWeek: 8,
    nextWeek: 12,
    backlog: 15,
    hearings: [
      {
        id: 'H-2024-001',
        caseNumber: 'LEG-2024-145',
        employer: 'Caribbean Construction Ltd',
        type: 'Initial Hearing',
        date: '2024-05-15',
        time: '09:00 AM',
        venue: 'High Court, Basseterre',
        judge: 'Hon. Justice Williams',
        status: 'Scheduled'
      },
      {
        id: 'H-2024-002',
        caseNumber: 'LEG-2024-138',
        employer: 'Island Resort & Spa',
        type: 'Follow-up Hearing',
        date: '2024-05-16',
        time: '10:30 AM',
        venue: 'High Court, Basseterre',
        judge: 'Hon. Justice Thompson',
        status: 'Scheduled'
      },
      {
        id: 'H-2024-003',
        caseNumber: 'LEG-2024-129',
        employer: 'Tech Solutions Inc',
        type: 'Final Hearing',
        date: '2024-05-17',
        time: '02:00 PM',
        venue: 'Magistrates Court, Nevis',
        judge: 'Magistrate Johnson',
        status: 'Scheduled'
      },
      {
        id: 'H-2024-004',
        caseNumber: 'LEG-2024-112',
        employer: 'Belmont Services Ltd',
        type: 'Initial Hearing',
        date: '2024-05-20',
        time: '09:00 AM',
        venue: 'High Court, Basseterre',
        judge: 'Hon. Justice Williams',
        status: 'Scheduled'
      },
      {
        id: 'H-2024-005',
        caseNumber: 'LEG-2024-098',
        employer: 'Paradise Hotels Group',
        type: 'Enforcement Hearing',
        date: '2024-05-22',
        time: '11:00 AM',
        venue: 'High Court, Basseterre',
        judge: 'Hon. Justice Davis',
        status: 'Scheduled'
      }
    ],
    backlogCases: [
      { caseNumber: 'LEG-2023-234', employer: 'Old Construction Ltd', daysOverdue: 120, lastHearing: '2024-01-15' },
      { caseNumber: 'LEG-2023-198', employer: 'Heritage Builders', daysOverdue: 95, lastHearing: '2024-02-01' },
      { caseNumber: 'LEG-2023-156', employer: 'Coastal Services', daysOverdue: 85, lastHearing: '2024-02-15' }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-info/10 text-info border-info/20';
      case 'Pending':
        return 'bg-warning/15 text-warning border-warning/20';
      case 'Overdue':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Hearings</h1>
        <p className="text-muted-foreground">Upcoming hearings and backlog</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Upcoming</p>
              <p className="text-2xl font-bold mt-2">{hearingsData.upcomingTotal}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-info" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold mt-2">{hearingsData.thisWeek}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Next Week</p>
              <p className="text-2xl font-bold mt-2">{hearingsData.nextWeek}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Backlog</p>
              <p className="text-2xl font-bold mt-2 text-destructive">{hearingsData.backlog}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Hearings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Hearing ID</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Case Number</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Employer</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Venue</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Judge/Magistrate</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {hearingsData.hearings.map((hearing) => (
                <tr key={hearing.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{hearing.id}</td>
                  <td className="p-3 text-primary font-medium">{hearing.caseNumber}</td>
                  <td className="p-3">{hearing.employer}</td>
                  <td className="p-3">
                    <Badge variant="outline">{hearing.type}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(hearing.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">{hearing.time}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {hearing.venue}
                    </div>
                  </td>
                  <td className="p-3 text-sm">{hearing.judge}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={getStatusColor(hearing.status)}>
                      {hearing.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Backlog Cases</h2>
          <Badge variant="destructive">Action Required</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Case Number</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Employer</th>
                <th className="text-right p-3 text-sm font-medium text-muted-foreground">Days Overdue</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Hearing</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Urgency</th>
              </tr>
            </thead>
            <tbody>
              {hearingsData.backlogCases.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium text-primary">{item.caseNumber}</td>
                  <td className="p-3">{item.employer}</td>
                  <td className="p-3 text-right">
                    <Badge variant="destructive">{item.daysOverdue} days</Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(item.lastHearing).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Badge variant={item.daysOverdue > 100 ? 'destructive' : 'secondary'}>
                      {item.daysOverdue > 100 ? 'Critical' : 'High'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
