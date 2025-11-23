import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { mockStages, mockStatuses, LegalStatus } from '@/data/mockLegalWorkflow';
import { StatusFormDialog } from './StatusFormDialog';
import { toast } from 'sonner';

export function StatusesTab() {
  const [statuses, setStatuses] = useState<LegalStatus[]>(mockStatuses);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<LegalStatus | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddStatus = () => {
    setEditingStatus(null);
    setShowDialog(true);
  };

  const handleEditStatus = (status: LegalStatus) => {
    setEditingStatus(status);
    setShowDialog(true);
  };

  const handleSaveStatus = (statusData: Omit<LegalStatus, 'id'>) => {
    if (editingStatus) {
      // Update existing
      setStatuses(statuses.map(s => 
        s.id === editingStatus.id ? { ...statusData, id: editingStatus.id } : s
      ));
      toast.success('Status updated');
    } else {
      // Add new
      const newStatus: LegalStatus = {
        ...statusData,
        id: `status-${Date.now()}`
      };
      setStatuses([...statuses, newStatus]);
      toast.success('Status created');
    }
    setShowDialog(false);
  };

  const handleToggleActive = (statusId: string, active: boolean) => {
    setStatuses(statuses.map(s => 
      s.id === statusId ? { ...s, active } : s
    ));
    toast.success(active ? 'Status activated' : 'Status deactivated');
  };

  const getStageName = (stageId: string) => {
    return mockStages.find(s => s.id === stageId)?.name || 'Unknown';
  };

  const filteredStatuses = statuses
    .filter(s => filterStage === 'all' || s.stageId === filterStage)
    .filter(s => 
      searchTerm === '' || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const stageCompare = a.stageId.localeCompare(b.stageId);
      if (stageCompare !== 0) return stageCompare;
      return a.orderInStage - b.orderInStage;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Case Statuses</h3>
          <p className="text-sm text-muted-foreground">
            Configure detailed statuses within each stage
          </p>
        </div>
        <Button onClick={handleAddStatus}>
          <Plus className="h-4 w-4 mr-2" />
          Add Status
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {mockStages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status Name</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="w-20 text-center">Start</TableHead>
              <TableHead className="w-20 text-center">End</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStatuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No statuses found
                </TableCell>
              </TableRow>
            ) : (
              filteredStatuses.map((status) => (
                <TableRow key={status.id}>
                  <TableCell className="font-medium">{status.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getStageName(status.stageId)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{status.code}</code>
                  </TableCell>
                  <TableCell className="text-center">
                    {status.isStartStatus ? (
                      <CheckCircle className="h-4 w-4 text-green-600 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground inline opacity-30" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {status.isEndStatus ? (
                      <CheckCircle className="h-4 w-4 text-red-600 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground inline opacity-30" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={status.active}
                      onCheckedChange={(checked) => handleToggleActive(status.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStatus(status)}
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

      <StatusFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        status={editingStatus}
        onSave={handleSaveStatus}
        allStatuses={statuses}
      />
    </div>
  );
}
