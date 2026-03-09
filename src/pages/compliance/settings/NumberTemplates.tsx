import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hash, Plus, Edit, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NumberTemplate {
  id: string;
  name: string;
  template_pattern: string;
  description: string | null;
  applies_to: string | null;
  is_default: boolean | null;
  padding_length: number | null;
  prefix: string | null;
  reset_frequency: string | null;
  is_active: boolean | null;
}

const fetchTemplates = async (): Promise<NumberTemplate[]> => {
  const { data, error } = await supabase
    .from('ce_number_templates')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as NumberTemplate[];
};

const generateExample = (pattern: string): string => {
  const now = new Date();
  return pattern
    .replace('{YYYY}', now.getFullYear().toString())
    .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
    .replace('{NNNNN}', '00001')
    .replace('{NNNN}', '0001');
};

const NumberTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['ce_number_templates'],
    queryFn: fetchTemplates,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ce_number_templates')
        .update({ is_active } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ce_number_templates'] });
      toast.success('Template updated');
    },
    onError: () => toast.error('Failed to update template'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Number Templates</h1>
          </div>
          <p className="text-muted-foreground">Configure number generation templates for violations, cases, inspections, and notices</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add Template</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Variables</CardTitle>
          <CardDescription>Use these placeholders in your template patterns. The system will auto-generate unique numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{YYYY}'} = Year (e.g. 2026)</Badge>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{MM}'} = Month (e.g. 03)</Badge>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{NNNNN}'} = Sequential padded (e.g. 00142)</Badge>
            <Badge variant="outline" className="font-mono text-xs py-1 px-3">{'{TERRITORY}'} = SK or NV</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {templates.map((tmpl) => (
          <Card key={tmpl.id} className={`hover:shadow-sm transition-shadow ${!tmpl.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{tmpl.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{tmpl.applies_to}</Badge>
                      <Badge variant="outline" className="text-[10px]">Reset: {tmpl.reset_frequency}</Badge>
                      {tmpl.is_active && <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground">Pattern: <span className="font-mono text-foreground">{tmpl.template_pattern}</span></span>
                      <span className="text-sm text-muted-foreground">Preview: <span className="font-mono font-medium text-primary">{generateExample(tmpl.template_pattern)}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Switch
                    checked={tmpl.is_active ?? false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: tmpl.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No templates configured</div>
        )}
      </div>
    </div>
  );
};

export default NumberTemplates;
