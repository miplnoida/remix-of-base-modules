import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Download, FileText, Calendar, MessageSquare, CheckSquare, DollarSign } from "lucide-react";

interface CaseTimelineTabProps {
  caseData: MockCase;
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'Document':
      return <FileText className="h-4 w-4" />;
    case 'Hearing':
      return <Calendar className="h-4 w-4" />;
    case 'Task':
      return <CheckSquare className="h-4 w-4" />;
    case 'Payment':
      return <DollarSign className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

export function CaseTimelineTab({ caseData }: CaseTimelineTabProps) {
  const timelineEvents = [
    ...caseData.activities.map(a => ({ ...a, type: 'Status' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Complete Timeline</h2>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Timeline
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-0 before:w-px before:bg-border">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm">{event.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{event.user}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
