import { useState } from 'react';
import { Plus, Trash2, Eye, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface FieldUpdate {
  id?: string;
  field_name: string;
  field_value: string;
  display_order: number;
}

interface ActionFieldUpdatesEditorProps {
  fieldUpdates: FieldUpdate[];
  onChange: (updates: FieldUpdate[]) => void;
  validTableColumns?: string[];
  targetTable?: string;
  disabled?: boolean;
}

const SUPPORTED_PLACEHOLDERS = [
  { placeholder: '{{current_user}}', description: 'The ID of the user executing the action' },
  { placeholder: '{{current_user_name}}', description: 'The full name of the user executing the action' },
  { placeholder: '{{current_date}}', description: 'Current date in YYYY-MM-DD format' },
  { placeholder: '{{current_datetime}}', description: 'Current date and time in ISO format' },
  { placeholder: '{{workflow_status}}', description: 'The status of the workflow (Approved, Rejected, etc.)' },
  { placeholder: '{{action_name}}', description: 'The name of the action being executed' },
  { placeholder: '{{step_name}}', description: 'The name of the current workflow step' },
];

export default function ActionFieldUpdatesEditor({
  fieldUpdates,
  onChange,
  validTableColumns = [],
  targetTable,
  disabled = false,
}: ActionFieldUpdatesEditorProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const addFieldUpdate = () => {
    const newUpdate: FieldUpdate = {
      field_name: '',
      field_value: '',
      display_order: fieldUpdates.length,
    };
    onChange([...fieldUpdates, newUpdate]);
  };

  const removeFieldUpdate = (index: number) => {
    const newUpdates = fieldUpdates.filter((_, i) => i !== index);
    // Re-order
    newUpdates.forEach((u, i) => (u.display_order = i));
    onChange(newUpdates);
    // Clear error for this index
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const updateField = (index: number, field: keyof FieldUpdate, value: string) => {
    const newUpdates = [...fieldUpdates];
    (newUpdates[index] as any)[field] = value;
    onChange(newUpdates);

    // Validate field name if columns are provided
    if (field === 'field_name' && validTableColumns.length > 0) {
      const newErrors = { ...errors };
      if (value && !validTableColumns.includes(value.toLowerCase())) {
        newErrors[index] = `"${value}" is not a valid column in ${targetTable || 'the target table'}`;
      } else {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const resolvePlaceholder = (placeholder: string): string => {
    const now = new Date();
    switch (placeholder) {
      case '{{current_user}}':
        return '[current-user-id]';
      case '{{current_user_name}}':
        return '[Current User Name]';
      case '{{current_date}}':
        return now.toISOString().split('T')[0];
      case '{{current_datetime}}':
        return now.toISOString();
      case '{{workflow_status}}':
        return 'Approved';
      case '{{action_name}}':
        return '[Action Name]';
      case '{{step_name}}':
        return '[Step Name]';
      default:
        return placeholder;
    }
  };

  const resolveValue = (value: string): string => {
    let resolved = value;
    SUPPORTED_PLACEHOLDERS.forEach(({ placeholder }) => {
      resolved = resolved.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), resolvePlaceholder(placeholder));
    });
    return resolved;
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Action Field Updates</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm">
                  Configure field updates that will be automatically applied to the application record when this action is executed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {fieldUpdates.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFieldUpdate}
            disabled={disabled}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Field
          </Button>
        </div>
      </div>

      {fieldUpdates.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Field Name</TableHead>
                <TableHead className="w-[55%]">Field Value</TableHead>
                <TableHead className="w-[10%] text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldUpdates.map((update, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        value={update.field_name}
                        onChange={(e) => updateField(index, 'field_name', e.target.value)}
                        placeholder="e.g., status"
                        disabled={disabled}
                        className={errors[index] ? 'border-destructive' : ''}
                      />
                      {errors[index] && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors[index]}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={update.field_value}
                      onChange={(e) => updateField(index, 'field_value', e.target.value)}
                      placeholder="e.g., Approved or {{workflow_status}}"
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFieldUpdate(index)}
                      disabled={disabled}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/20">
          No field updates configured. Click "Add Field" to add automatic field updates for this action.
        </div>
      )}

      {/* Placeholder Reference */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Supported Placeholders:</Label>
        <div className="flex flex-wrap gap-1">
          {SUPPORTED_PLACEHOLDERS.map(({ placeholder, description }) => (
            <TooltipProvider key={placeholder}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-help font-mono">
                    {placeholder}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            One or more field names are invalid. Please correct them before saving.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Field Updates Preview</DialogTitle>
            <DialogDescription>
              Preview of field values that will be applied when this action is executed.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Configured Value</TableHead>
                  <TableHead>Resolved Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldUpdates.map((update, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{update.field_name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{update.field_value || '-'}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      {update.field_value ? resolveValue(update.field_value) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: This is a preview using sample values. Actual values will be resolved at execution time.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
