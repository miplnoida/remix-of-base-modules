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
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-border" />
            
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="relative pl-12">
                {/* Event icon */}
                <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                  <div className="text-primary">
                    {getEventIcon(event.type)}
                  </div>
                </div>
                
                {/* Event content card */}
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-xs font-medium">
                            {event.type}
                          </Badge>
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
                        
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                          {event.action}
                        </p>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {event.user.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {event.user}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
