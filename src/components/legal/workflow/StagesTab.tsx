import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil } from 'lucide-react';
import { mockStages, LegalStage } from '@/data/mockLegalWorkflow';
import { StageFormDialog } from './StageFormDialog';
import { toast } from 'sonner';

export function StagesTab() {
  const [stages, setStages] = useState<LegalStage[]>(mockStages);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<LegalStage | null>(null);

  const handleAddStage = () => {
    setEditingStage(null);
    setShowDialog(true);
  };

  const handleEditStage = (stage: LegalStage) => {
    setEditingStage(stage);
    setShowDialog(true);
  };

  const handleSaveStage = (stageData: Omit<LegalStage, 'id'>) => {
    if (editingStage) {
      // Update existing
      setStages(stages.map(s => 
        s.id === editingStage.id ? { ...stageData, id: editingStage.id } : s
      ));
      toast.success('Stage updated');
    } else {
      // Add new
      const newStage: LegalStage = {
        ...stageData,
        id: `stage-${Date.now()}`
      };
      setStages([...stages, newStage]);
      toast.success('Stage created');
    }
    setShowDialog(false);
  };

  const handleToggleActive = (stageId: string, active: boolean) => {
    setStages(stages.map(s => 
      s.id === stageId ? { ...s, active } : s
    ));
    toast.success(active ? 'Stage activated' : 'Stage deactivated');
  };

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Case Stages</h3>
          <p className="text-sm text-muted-foreground">
            Manage the high-level stages of legal case workflow
          </p>
        </div>
        <Button onClick={handleAddStage}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
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
            {sortedStages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No stages configured
                </TableCell>
              </TableRow>
            ) : (
              sortedStages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="font-medium">{stage.order}</TableCell>
                  <TableCell className="font-medium">{stage.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{stage.code}</code>
                  </TableCell>
                  <TableCell>
                    {stage.colour && (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: stage.colour }}
                        />
                        <span className="text-xs text-muted-foreground">{stage.colour}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={stage.active}
                      onCheckedChange={(checked) => handleToggleActive(stage.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStage(stage)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StageFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        stage={editingStage}
        onSave={handleSaveStage}
      />
    </div>
  );
}
