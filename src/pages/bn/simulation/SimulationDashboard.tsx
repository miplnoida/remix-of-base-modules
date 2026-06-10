import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FlaskConical, Play, CheckCircle, XCircle, Clock, Archive } from 'lucide-react';
import { useBnSimScenarios, useDeleteSimScenario } from '@/hooks/bn/useBnSimulation';
import { BnEmptyState } from '@/components/bn/shared/BnEmptyState';
import { BnStatCard } from '@/components/bn/shared/BnStatCard';
import type { BnSimScenario } from '@/types/bnSimulation';
import { toast } from 'sonner';
import { useSimPermission } from '@/hooks/bn/useSimPermission';
import SimAccessDenied from '@/components/bn/simulation/SimAccessDenied';

import { formatDate } from '@/lib/culture/culture';
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  RUNNING: 'secondary',
  COMPLETED: 'default',
  FAILED: 'destructive',
  ARCHIVED: 'outline',
};

export default function SimulationDashboard() {
  const navigate = useNavigate();
  const { canView, canCreate, canDelete } = useSimPermission();
  const { data: scenarios, isLoading, isError } = useBnSimScenarios();
  const deleteMut = useDeleteSimScenario();

  if (!canView) return <SimAccessDenied />;

  if (isLoading) return <BnEmptyState type="loading" />;
  if (isError) return <BnEmptyState type="error" />;

  const list = scenarios || [];
  const completed = list.filter(s => s.status === 'COMPLETED').length;
  const failed = list.filter(s => s.status === 'FAILED').length;
  const draft = list.filter(s => s.status === 'DRAFT').length;

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Scenario deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-6">
      {/* Simulation mode banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Simulation Workspace — Non-Production</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">All data here is isolated from live claims and payments. Results are for testing only.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-page-title flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Benefit Simulation Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Test benefit products using existing configurations safely</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/bn/simulation/new')} className="gap-2">
            <Plus className="h-4 w-4" /> New Scenario
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BnStatCard title="Total Scenarios" value={list.length} icon={FlaskConical} />
        <BnStatCard title="Completed" value={completed} icon={CheckCircle} />
        <BnStatCard title="Failed" value={failed} icon={XCircle} />
        <BnStatCard title="Drafts" value={draft} icon={Clock} />
      </div>

      {/* Scenario list */}
      {list.length === 0 ? (
        <BnEmptyState
          type="empty"
          title="No simulation scenarios"
          description="Create your first scenario to begin testing benefit products."
          action={{ label: 'Create Scenario', onClick: () => navigate('/bn/simulation/new') }}
        />
      ) : (
        <div className="grid gap-4">
          {list.map((s: BnSimScenario) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/bn/simulation/${s.id}`)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{s.scenario_name}</h3>
                      <Badge variant={STATUS_VARIANT[s.status] || 'outline'}>{s.status}</Badge>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground mt-1 truncate">{s.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {formatDate(new Date(s.entered_at))} · {s.country_code}
                    </p>
                  </div>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/bn/simulation/${s.id}`)}>
                      <Play className="h-3 w-3 mr-1" /> Open
                    </Button>
                    {canDelete && s.status === 'DRAFT' && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(s.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
