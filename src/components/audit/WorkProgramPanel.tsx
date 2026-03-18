import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { useWorkPrograms, useWorkProgramMutations, useWorkProgramSteps, useWorkProgramStepMutations, useTestingProcedures, useTestingProcedureMutations } from '@/hooks/useWorkPrograms';
import { Plus, ChevronDown, ChevronRight, FlaskConical, ListChecks, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Props {
  engagementId: string;
  readOnly?: boolean;
}

export function WorkProgramPanel({ engagementId, readOnly }: Props) {
  const { data: programs = [], isLoading } = useWorkPrograms(engagementId);
  const { create: createProgram } = useWorkProgramMutations();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const handleCreateProgram = () => {
    if (!newTitle.trim()) return;
    createProgram.mutate({ engagement_id: engagementId, title: newTitle, objective: newObjective });
    setNewTitle('');
    setNewObjective('');
    setShowCreate(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Work Programs ({programs.length})</h3>
        {!readOnly && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Work Program</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Work Program</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Work Program Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <Textarea placeholder="Objective" value={newObjective} onChange={(e) => setNewObjective(e.target.value)} rows={3} />
                <Button onClick={handleCreateProgram} disabled={createProgram.isPending || !newTitle.trim()}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading work programs...</p>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ListChecks className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No work programs created yet.</p>
            {!readOnly && <p className="text-xs mt-1">Create a work program to define audit steps and testing procedures.</p>}
          </CardContent>
        </Card>
      ) : (
        programs.map((prog: any) => (
          <Card key={prog.id}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedProgram(expandedProgram === prog.id ? null : prog.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedProgram === prog.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">{prog.title}</CardTitle>
                  <StatusBadge status={prog.status} />
                </div>
              </div>
              {prog.objective && <p className="text-xs text-muted-foreground mt-1 ml-6">{prog.objective}</p>}
            </CardHeader>
            {expandedProgram === prog.id && (
              <CardContent>
                <WorkProgramStepsPanel workProgramId={prog.id} engagementId={engagementId} readOnly={readOnly} />
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

function WorkProgramStepsPanel({ workProgramId, engagementId, readOnly }: { workProgramId: string; engagementId: string; readOnly?: boolean }) {
  const { data: steps = [], isLoading } = useWorkProgramSteps(workProgramId);
  const { create: createStep, remove: removeStep } = useWorkProgramStepMutations();
  const [showAdd, setShowAdd] = useState(false);
  const [stepName, setStepName] = useState('');
  const [stepDesc, setStepDesc] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const handleAdd = () => {
    if (!stepName.trim()) return;
    createStep.mutate({
      work_program_id: workProgramId,
      engagement_id: engagementId,
      step_number: steps.length + 1,
      step_name: stepName,
      description: stepDesc,
    });
    setStepName('');
    setStepDesc('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Audit Steps ({steps.length})</span>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3 w-3 mr-1" />Add Step
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="flex gap-2 p-3 rounded-lg bg-muted/50">
          <Input placeholder="Step name" value={stepName} onChange={(e) => setStepName(e.target.value)} className="flex-1" />
          <Input placeholder="Description" value={stepDesc} onChange={(e) => setStepDesc(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={handleAdd} disabled={createStep.isPending}>Add</Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading steps...</p>
      ) : steps.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No steps defined yet.</p>
      ) : (
        <div className="space-y-2">
          {steps.map((step: any) => (
            <div key={step.id} className="border rounded-lg">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedStep === step.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Badge variant="outline" className="text-xs">{step.step_number}</Badge>
                  <span className="text-sm font-medium">{step.step_name}</span>
                  <StatusBadge status={step.status} />
                </div>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeStep.mutate(step.id); }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              {step.description && expandedStep !== step.id && (
                <p className="px-3 pb-2 text-xs text-muted-foreground">{step.description}</p>
              )}
              {expandedStep === step.id && (
                <div className="px-3 pb-3 border-t">
                  {step.description && <p className="text-xs text-muted-foreground py-2">{step.description}</p>}
                  <TestingProceduresPanel stepId={step.id} engagementId={engagementId} readOnly={readOnly} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TestingProceduresPanel({ stepId, engagementId, readOnly }: { stepId: string; engagementId: string; readOnly?: boolean }) {
  const { data: procedures = [], isLoading } = useTestingProcedures(stepId);
  const { create, update } = useTestingProcedureMutations();
  const [showAdd, setShowAdd] = useState(false);
  const [procName, setProcName] = useState('');
  const [testType, setTestType] = useState('Substantive');
  const [expected, setExpected] = useState('');

  const handleAdd = () => {
    if (!procName.trim()) return;
    create.mutate({
      step_id: stepId,
      engagement_id: engagementId,
      procedure_name: procName,
      test_type: testType,
      expected_result: expected,
    });
    setProcName('');
    setExpected('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1"><FlaskConical className="h-3 w-3" />Testing Procedures ({procedures.length})</span>
        {!readOnly && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3 w-3 mr-1" />Add Test
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="space-y-2 p-2 rounded bg-muted/30">
          <Input placeholder="Procedure name" value={procName} onChange={(e) => setProcName(e.target.value)} className="h-8 text-xs" />
          <div className="flex gap-2">
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Substantive">Substantive</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Analytical">Analytical</SelectItem>
                <SelectItem value="Walkthrough">Walkthrough</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Expected result" value={expected} onChange={(e) => setExpected(e.target.value)} className="h-8 text-xs flex-1" />
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>Add</Button>
          </div>
        </div>
      )}

      {procedures.length === 0 && !showAdd ? (
        <p className="text-xs text-muted-foreground text-center py-2">No testing procedures.</p>
      ) : (
        procedures.map((proc: any) => (
          <div key={proc.id} className="flex items-center justify-between p-2 rounded border bg-background text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{proc.test_type}</Badge>
              <span>{proc.procedure_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {!readOnly ? (
                <Select
                  value={proc.conclusion || 'Pending'}
                  onValueChange={(val) => update.mutate({ id: proc.id, conclusion: val })}
                >
                  <SelectTrigger className="h-6 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Effective">Effective</SelectItem>
                    <SelectItem value="Ineffective">Ineffective</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={proc.conclusion || 'Pending'} />
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
