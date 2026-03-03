import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { CreateTaskDialog } from "@/components/legal/CreateTaskDialog";

interface CaseTasksTabProps {
  caseData: MockCase;
}

const mockTasks = [
  { id: 1, title: 'Review initial complaint', owner: 'Legal Officer', dueOn: '2025-02-01', priority: 'High', status: 'To Do' },
  { id: 2, title: 'Prepare summons documents', owner: 'Legal Clerk', dueOn: '2025-02-05', priority: 'Medium', status: 'Doing' },
  { id: 3, title: 'Schedule initial hearing', owner: 'Court Coordinator', dueOn: '2025-02-10', priority: 'High', status: 'To Do' },
];

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return <Badge variant="destructive">{priority}</Badge>;
    case 'High':
      return <Badge className="bg-warning text-warning-foreground">{priority}</Badge>;
    case 'Medium':
      return <Badge variant="warning">{priority}</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
};

export function CaseTasksTab({ caseData }: CaseTasksTabProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const groupedTasks = {
    'To Do': mockTasks.filter(t => t.status === 'To Do'),
    'Doing': mockTasks.filter(t => t.status === 'Doing'),
    'Done': mockTasks.filter(t => t.status === 'Done'),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(groupedTasks).map(([status, tasks]) => (
          <Card key={status}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {status === 'To Do' && <Clock className="h-4 w-4 text-muted-foreground" />}
                {status === 'Doing' && <AlertCircle className="h-4 w-4 text-info" />}
                {status === 'Done' && <CheckCircle className="h-4 w-4 text-success" />}
                {status}
                <Badge variant="outline" className="ml-auto text-xs">
                  {tasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="font-medium text-sm mb-2">{task.title}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{task.owner}</span>
                    {getPriorityBadge(task.priority)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Due: {new Date(task.dueOn).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        caseId={caseData.id}
        onTaskCreated={() => {}}
      />
    </div>
  );
}
