import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Loader2, Inbox } from 'lucide-react';
import { StageFormDialog } from './StageFormDialog';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export interface LegalStage {
  id: string;
  name: string;
  code: string;
  order: number;
  active: boolean;
  colour?: string;
}

async function fetchStages(): Promise<LegalStage[]> {
  const { data, error } = await supabase
    .from('legal_workflow_stages')
    .select('id, name, code, sort_order, active, colour')
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(s => ({ ...s, order: s.sort_order }));
}

export function StagesTab() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<LegalStage | null>(null);

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['legal-workflow-stages'],
    queryFn: fetchStages,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ stageData, editId }: { stageData: Omit<LegalStage, 'id'>; editId?: string }) => {
      const payload = { name: stageData.name, code: stageData.code, sort_order: stageData.order, active: stageData.active, colour: stageData.colour };
      if (editId) {
        const { error } = await supabase.from('legal_workflow_stages').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('legal_workflow_stages').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['legal-workflow-stages'] });
      toast.success(vars.editId ? 'Stage updated' : 'Stage created');
      setShowDialog(false);
    },
    onError: () => toast.error('Failed to save stage'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('legal_workflow_stages').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['legal-workflow-stages'] });
      toast.success(vars.active ? 'Stage activated' : 'Stage deactivated');
    },
  });

  const handleAddStage = () => { setEditingStage(null); setShowDialog(true); };
  const handleEditStage = (stage: LegalStage) => { setEditingStage(stage); setShowDialog(true); };
  const handleSaveStage = (stageData: Omit<LegalStage, 'id'>) => {
    saveMutation.mutate({ stageData, editId: editingStage?.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Case Stages</h3>
          <p className="text-sm text-muted-foreground">Manage the high-level stages of legal case workflow</p>
        </div>
        <Button onClick={handleAddStage}><Plus className="h-4 w-4 mr-2" />Add Stage</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="w-24">Colour</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Inbox className="h-10 w-10 mb-2" />
                    <p>No stages configured</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              stages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="font-medium">{stage.order}</TableCell>
                  <TableCell className="font-medium">{stage.name}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{stage.code}</code></TableCell>
                  <TableCell>
                    {stage.colour && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border" style={{ backgroundColor: stage.colour }} />
                        <span className="text-xs text-muted-foreground">{stage.colour}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={stage.active} onCheckedChange={(checked) => toggleMutation.mutate({ id: stage.id, active: checked })} />
                  </TableCell>
                  <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditStage(stage)} title="Edit stage">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StageFormDialog open={showDialog} onOpenChange={setShowDialog} stage={editingStage} onSave={handleSaveStage} />
    </div>
  );
}
