import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSaveWorkflowActionApiConfig,
  useDeleteWorkflowActionApiConfig,
  useWorkflowActionApiConfig,
  VALUE_SOURCE_OPTIONS,
  SOURCE_KEY_SUGGESTIONS,
  STANDARD_ACTION_CODES,
  type WorkflowActionApiBodyMapping,
} from '@/hooks/useWorkflowActionApi';
import { useUserCode } from '@/hooks/useUserCode';

interface WorkflowActionApiConfigProps {
  workflowId: string;
  stepId: string;
  stepName: string;
  actionCode: string;
  actionName: string;
  onSaved?: () => void;
  onDeleted?: () => void;
  onCancel?: () => void;
}

interface BodyMappingRow {
  id: string;
  json_field_name: string;
  value_source: 'APPLICATION' | 'MEETING' | 'WORKFLOW' | 'SYSTEM' | 'STATIC';
  source_key: string;
  static_value: string;
  is_required: boolean;
  display_order: number;
}

export function WorkflowActionApiConfig({
  workflowId,
  stepId,
  stepName,
  actionCode,
  actionName,
  onSaved,
  onDeleted,
  onCancel,
}: WorkflowActionApiConfigProps) {
  const { userCode } = useUserCode();
  const saveConfig = useSaveWorkflowActionApiConfig();
  const deleteConfig = useDeleteWorkflowActionApiConfig();

  // Fetch existing config internally
  const { data: existingConfig, isLoading: isLoadingConfig } = useWorkflowActionApiConfig(
    workflowId,
    stepId,
    actionCode
  );
  const [initialized, setInitialized] = useState(false);

  // API config state
  const [httpMethod, setHttpMethod] = useState('POST');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [apiKeySecretName, setApiKeySecretName] = useState('');
  const [contentType, setContentType] = useState('application/json');
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [retryCount, setRetryCount] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');

  // Body mappings state
  const [bodyMappings, setBodyMappings] = useState<BodyMappingRow[]>([]);

  // Initialize form state from fetched config
  useEffect(() => {
    if (isLoadingConfig || initialized) return;
    if (existingConfig) {
      setHttpMethod(existingConfig.http_method || 'POST');
      setEndpointUrl(existingConfig.endpoint_url || '');
      setApiKeySecretName(existingConfig.api_key_secret_name || '');
      setContentType(existingConfig.content_type || 'application/json');
      setTimeoutSeconds(existingConfig.timeout_seconds || 30);
      setRetryCount(existingConfig.retry_count || 0);
      setIsActive(existingConfig.is_active ?? true);
      setDescription(existingConfig.description || '');
      if (existingConfig.body_mappings) {
        setBodyMappings(
          existingConfig.body_mappings.map((m: any, i: number) => ({
            id: `existing-${i}`,
            json_field_name: m.json_field_name,
            value_source: m.value_source,
            source_key: m.source_key,
            static_value: m.static_value || '',
            is_required: m.is_required,
            display_order: m.display_order,
          }))
        );
      }
      setInitialized(true);
    } else if (!isLoadingConfig) {
      // No existing config - set defaults
      // Initialize with standard fields
      setBodyMappings([
        {
          id: 'default-1',
          json_field_name: 'application_reference_number',
          value_source: 'APPLICATION',
          source_key: 'application_reference_no',
          static_value: '',
          is_required: true,
          display_order: 0,
        },
        {
          id: 'default-2',
          json_field_name: 'action',
          value_source: 'WORKFLOW',
          source_key: 'action_code',
          static_value: '',
          is_required: true,
          display_order: 1,
        },
        {
          id: 'default-3',
          json_field_name: 'action_by',
          value_source: 'SYSTEM',
          source_key: 'logged_in_user',
          static_value: '',
          is_required: true,
          display_order: 2,
        },
        {
          id: 'default-4',
          json_field_name: 'action_at',
          value_source: 'SYSTEM',
          source_key: 'current_timestamp',
          static_value: '',
          is_required: true,
          display_order: 3,
        },
      ]);
    }
  }, [existingConfig]);

  const addBodyMapping = () => {
    setBodyMappings([
      ...bodyMappings,
      {
        id: `new-${Date.now()}`,
        json_field_name: '',
        value_source: 'APPLICATION',
        source_key: '',
        static_value: '',
        is_required: false,
        display_order: bodyMappings.length,
      },
    ]);
  };

  const removeBodyMapping = (id: string) => {
    setBodyMappings(bodyMappings.filter((m) => m.id !== id));
  };

  const updateBodyMapping = (id: string, field: keyof BodyMappingRow, value: any) => {
    setBodyMappings(
      bodyMappings.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = async () => {
    if (!endpointUrl.trim()) {
      toast.error('Endpoint URL is required');
      return;
    }

    if (!apiKeySecretName.trim()) {
      toast.error('API Key Secret Name is required');
      return;
    }

    const validMappings = bodyMappings.filter(
      (m) => m.json_field_name.trim() && (m.value_source === 'STATIC' || m.source_key.trim())
    );

    if (validMappings.length === 0) {
      toast.error('At least one body mapping is required');
      return;
    }

    try {
      await saveConfig.mutateAsync({
        config: {
          workflow_id: workflowId,
          workflow_step_id: stepId,
          action_code: actionCode,
          http_method: httpMethod,
          endpoint_url: endpointUrl,
          api_key_secret_name: apiKeySecretName,
          content_type: contentType,
          timeout_seconds: timeoutSeconds,
          retry_count: retryCount,
          is_active: isActive,
          description: description || undefined,
          created_by: userCode || 'System',
        },
        bodyMappings: validMappings.map((m, i) => ({
          json_field_name: m.json_field_name,
          value_source: m.value_source,
          source_key: m.value_source === 'STATIC' ? 'static' : m.source_key,
          static_value: m.value_source === 'STATIC' ? m.static_value : undefined,
          is_required: m.is_required,
          display_order: i,
        })),
        createdBy: userCode || 'System',
      });

      onSaved?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            API Configuration for "{actionName}"
          </CardTitle>
          <CardDescription>
            Configure the external API to call when this action is executed on step "{stepName}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select value={httpMethod} onValueChange={setHttpMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <Input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                placeholder="application/json"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endpoint URL</Label>
            <Input
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://api.example.com/applications/status"
            />
            <p className="text-xs text-muted-foreground">
              Supports placeholders like {"{{applicationId}}"} that will be resolved at runtime
            </p>
          </div>

          <div className="space-y-2">
            <Label>API Key Secret Name</Label>
            <Input
              value={apiKeySecretName}
              onChange={(e) => setApiKeySecretName(e.target.value)}
              placeholder="PUBLIC_PORTAL_API_KEY"
            />
            <p className="text-xs text-muted-foreground">
              Name of the secret stored in Supabase Secrets. Never include the actual API key here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                min={1}
                max={300}
              />
            </div>

            <div className="space-y-2">
              <Label>Retry Count</Label>
              <Input
                type="number"
                value={retryCount}
                onChange={(e) => setRetryCount(parseInt(e.target.value) || 0)}
                min={0}
                max={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this API integration..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Request Body Mapping</CardTitle>
              <CardDescription>
                Define how the JSON request body is constructed dynamically
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addBodyMapping}>
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">JSON Field Name</TableHead>
                <TableHead className="w-[140px]">Value Source</TableHead>
                <TableHead>Source Key / Static Value</TableHead>
                <TableHead className="w-[80px]">Required</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bodyMappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Input
                      value={mapping.json_field_name}
                      onChange={(e) =>
                        updateBodyMapping(mapping.id, 'json_field_name', e.target.value)
                      }
                      placeholder="field_name"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.value_source}
                      onValueChange={(v) =>
                        updateBodyMapping(mapping.id, 'value_source', v)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALUE_SOURCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping.value_source === 'STATIC' ? (
                      <Input
                        value={mapping.static_value}
                        onChange={(e) =>
                          updateBodyMapping(mapping.id, 'static_value', e.target.value)
                        }
                        placeholder="Static value"
                        className="h-8"
                      />
                    ) : (
                      <Select
                        value={mapping.source_key}
                        onValueChange={(v) =>
                          updateBodyMapping(mapping.id, 'source_key', v)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select or type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_KEY_SUGGESTIONS[mapping.value_source]?.map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={mapping.is_required}
                      onCheckedChange={(v) =>
                        updateBodyMapping(mapping.id, 'is_required', v)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeBodyMapping(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {bodyMappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No body mappings defined. Click "Add Field" to add mappings.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <div>
          {existingConfig?.id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteConfig.isPending}>
                  {deleteConfig.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Remove API Configuration
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove API Configuration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the API configuration and all body mappings for the "{actionName}" action on step "{stepName}". Workflow actions will no longer trigger external API calls.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        await deleteConfig.mutateAsync(existingConfig.id);
                        onDeleted?.();
                      } catch (error) {
                        // Error handled by mutation
                      }
                    }}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={saveConfig.isPending}>
            {saveConfig.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save API Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WorkflowActionApiConfig;
