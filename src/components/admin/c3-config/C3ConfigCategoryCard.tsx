import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Save, X, Info } from 'lucide-react';
import { ConfigCategoryGroup, CONFIG_TYPE_INFO } from '@/types/c3CalculationConfig';
import { useUpdateC3Config } from '@/hooks/useC3CalculationConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface C3ConfigCategoryCardProps {
  group: ConfigCategoryGroup;
}

export function C3ConfigCategoryCard({ group }: C3ConfigCategoryCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    id: string;
    config_key: string;
    oldValue: number;
    newValue: number;
  } | null>(null);
  const [reason, setReason] = useState('');
  
  const updateConfig = useUpdateC3Config();

  const formatDisplayValue = (value: number, configType: string): string => {
    const typeInfo = CONFIG_TYPE_INFO[configType as keyof typeof CONFIG_TYPE_INFO];
    if (!typeInfo) return value.toString();
    
    const displayValue = value * typeInfo.multiplier;
    return displayValue.toFixed(typeInfo.decimals);
  };

  const parseInputValue = (input: string, configType: string): number => {
    const typeInfo = CONFIG_TYPE_INFO[configType as keyof typeof CONFIG_TYPE_INFO];
    if (!typeInfo) return parseFloat(input) || 0;
    
    return (parseFloat(input) || 0) / typeInfo.multiplier;
  };

  const handleEdit = (config: typeof group.configs[0]) => {
    setEditingId(config.id);
    setEditValue(formatDisplayValue(config.config_value, config.config_type));
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = (config: typeof group.configs[0]) => {
    const newValue = parseInputValue(editValue, config.config_type);
    
    if (newValue === config.config_value) {
      handleCancel();
      return;
    }
    
    setPendingUpdate({
      id: config.id,
      config_key: config.config_key,
      oldValue: config.config_value,
      newValue
    });
    setShowReasonDialog(true);
  };

  const handleConfirmUpdate = () => {
    if (!pendingUpdate) return;
    
    updateConfig.mutate({
      ...pendingUpdate,
      reason: reason || undefined
    }, {
      onSuccess: () => {
        setShowReasonDialog(false);
        setPendingUpdate(null);
        setReason('');
        handleCancel();
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{group.displayName}</CardTitle>
          <CardDescription>{group.description}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sm:w-[300px]">Parameter</TableHead>
                  <TableHead className="min-w-[120px] sm:w-[150px]">Current Value</TableHead>
                  <TableHead className="min-w-[80px] sm:w-[150px] hidden sm:table-cell">Type</TableHead>
                  <TableHead className="min-w-[80px] sm:w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.configs.map(config => {
                const typeInfo = CONFIG_TYPE_INFO[config.config_type as keyof typeof CONFIG_TYPE_INFO];
                const isEditing = editingId === config.id;
                
                return (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.display_name}</span>
                        {config.description && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px]">
                                <p>{config.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24"
                            step={typeInfo?.decimals === 0 ? 1 : 0.01}
                            min={0}
                          />
                          <span className="text-muted-foreground text-sm">
                            {typeInfo?.suffix}
                          </span>
                        </div>
                      ) : (
                        <span>
                          {formatDisplayValue(config.config_value, config.config_type)} {typeInfo?.suffix}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="capitalize text-muted-foreground text-xs sm:text-sm">
                        {config.config_type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(config)}
                            disabled={updateConfig.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={updateConfig.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(config)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Configuration Change</DialogTitle>
            <DialogDescription>
              You are about to change a calculation parameter. This will affect all future C3 submissions.
            </DialogDescription>
          </DialogHeader>
          
          {pendingUpdate && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Parameter:</strong> {pendingUpdate.config_key}
                </p>
                <p className="text-sm">
                  <strong>Old Value:</strong> {pendingUpdate.oldValue}
                </p>
                <p className="text-sm">
                  <strong>New Value:</strong> {pendingUpdate.newValue}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for change (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for this change..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReasonDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpdate} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? 'Saving...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
