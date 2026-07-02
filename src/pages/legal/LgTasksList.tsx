import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListChecks, User, Users, Globe } from "lucide-react";
import { LgTasksGrid } from "@/components/legal/lg/LgTasksGrid";
import { useLegalTeams } from "@/hooks/legal/useLegalTeams";
import { useLegalCapability } from "@/hooks/legal/useLegalCapability";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigate } from "react-router-dom";

export default function LgTasksList() {
  const { capability, isReady } = useLegalCapability();
  const { data: teams = [] } = useLegalTeams();
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  if (isReady && !capability.isLegal) {
    return <Navigate to="/legal/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ListChecks className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Legal Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Track, assign, escalate and close legal case tasks with SLA visibility.
          </p>
        </div>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine"><User className="h-4 w-4 mr-1" /> My Tasks</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" /> Team Queue</TabsTrigger>
          {capability.canViewAllWork && (
            <TabsTrigger value="all"><Globe className="h-4 w-4 mr-1" /> All Tasks</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine">
          <Card>
            <CardHeader><CardTitle>Tasks Assigned to Me</CardTitle></CardHeader>
            <CardContent>
              <LgTasksGrid myOnly gridId="tasks-mine" showCreate={false} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Team Queue</CardTitle>
                <div className="w-64">
                  <Select value={selectedTeam || "__ALL__"} onValueChange={(v) => setSelectedTeam(v === "__ALL__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">All Teams</SelectItem>
                      {teams
                        .map((t: any) => ({ ...t, _val: (t.team_code ?? t.id ?? "").toString() }))
                        .filter((t: any) => t._val.length > 0)
                        .map((t: any) => (
                          <SelectItem key={t._val} value={t._val}>
                            {t.team_name ?? t.team_code ?? t._val}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LgTasksGrid teamCode={selectedTeam} gridId="tasks-team" showCreate={false} />
            </CardContent>
          </Card>
        </TabsContent>

        {capability.canViewAllWork && (
          <TabsContent value="all">
            <Card>
              <CardHeader><CardTitle>All Legal Tasks</CardTitle></CardHeader>
              <CardContent>
                <LgTasksGrid gridId="tasks-all" showCreate={false} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
