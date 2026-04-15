import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, CheckCircle2, BookOpen, HelpCircle, FormInput, Route } from 'lucide-react';
import { toast } from 'sonner';

interface KBAIGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ContentType = 'articles' | 'faqs' | 'field_help' | 'guides';

export function KBAIGenerator({ open, onOpenChange }: KBAIGeneratorProps) {
  const qc = useQueryClient();
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>(['articles', 'faqs']);
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ type: string; count: number }[]>([]);

  const { data: modules = [] } = useQuery({
    queryKey: ['app-modules-for-kb'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name, route, description, parent_id')
        .eq('is_enabled', true)
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });

  // Group modules by parent for display
  const topModules = modules.filter(m => !m.parent_id);
  const childModules = modules.filter(m => m.parent_id);

  const screensForModule = modules.filter(m => {
    if (!selectedModule) return false;
    // Find selected module and its children
    return m.name === selectedModule || 
      modules.find(p => p.name === selectedModule && p.id === m.parent_id) ||
      modules.find(p => p.parent_id && modules.find(pp => pp.name === selectedModule && pp.id === p.parent_id) && p.id === m.parent_id);
  }).filter(m => m.route);

  const toggleScreen = (name: string) => {
    setSelectedScreens(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const toggleContentType = (ct: ContentType) => {
    setContentTypes(prev => prev.includes(ct) ? prev.filter(c => c !== ct) : [...prev, ct]);
  };

  const generate = async () => {
    if (!selectedModule || contentTypes.length === 0) {
      toast.error('Select a module and at least one content type');
      return;
    }

    setGenerating(true);
    setResults([]);

    try {
      const screens = selectedScreens.length > 0 ? selectedScreens : screensForModule.map(s => s.name);
      const moduleInfo = modules.filter(m => screens.includes(m.name) || m.name === selectedModule);

      const prompt = `You are a technical writer for an enterprise social insurance application. Generate knowledge base content for the "${selectedModule}" module.

Module screens: ${moduleInfo.map(m => `${m.display_name} (route: ${m.route || 'N/A'}, description: ${m.description || 'N/A'})`).join('; ')}

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Generate the following content types: ${contentTypes.join(', ')}

Return ONLY valid JSON in this exact format:
{
  "articles": [{"module_key": "${selectedModule}", "screen_key": "screen-name", "article_type": "screen_help", "title": "...", "summary": "...", "content": "markdown content", "audience": "all_users", "tags": ["tag1"], "status": "draft"}],
  "faqs": [{"module_key": "${selectedModule}", "screen_key": "screen-name", "question": "...", "answer": "markdown answer", "audience": "all_users", "tags": ["tag1"], "status": "draft"}],
  "field_help": [{"module_key": "${selectedModule}", "screen_key": "screen-name", "field_key": "field_name", "field_label": "Field Name", "short_help": "...", "full_help": "...", "source_type": "database", "status": "draft"}],
  "guides": [{"module_key": "${selectedModule}", "process_name": "...", "trigger_description": "...", "steps": [{"step": 1, "title": "...", "description": "..."}], "roles_involved": ["admin"], "expected_outcome": "...", "estimated_duration": "15 minutes", "status": "draft"}]
}

Only include the requested content types. Make content professional, detailed, and specific to social insurance operations.`;

      const { data, error } = await supabase.functions.invoke('ai-kb-generator', {
        body: { prompt, contentTypes },
      });

      if (error) throw error;

      const generated = data?.result;
      if (!generated) throw new Error('No content generated');

      const insertResults: { type: string; count: number }[] = [];

      if (generated.articles?.length) {
        const { error: e } = await supabase.from('kb_articles').insert(
          generated.articles.map((a: any) => ({ ...a, sort_order: 0, version: 1 }))
        );
        if (e) console.error('Article insert error:', e);
        else insertResults.push({ type: 'Articles', count: generated.articles.length });
      }

      if (generated.faqs?.length) {
        const { error: e } = await supabase.from('kb_faqs').insert(
          generated.faqs.map((f: any) => ({ ...f, sort_order: 0 }))
        );
        if (e) console.error('FAQ insert error:', e);
        else insertResults.push({ type: 'FAQs', count: generated.faqs.length });
      }

      if (generated.field_help?.length) {
        const { error: e } = await supabase.from('kb_field_help').insert(
          generated.field_help.map((f: any) => ({ ...f, version: 1 }))
        );
        if (e) console.error('Field help insert error:', e);
        else insertResults.push({ type: 'Field Help', count: generated.field_help.length });
      }

      if (generated.guides?.length) {
        const { error: e } = await supabase.from('kb_process_guides').insert(
          generated.guides.map((g: any) => ({ ...g, sort_order: 0 }))
        );
        if (e) console.error('Guide insert error:', e);
        else insertResults.push({ type: 'Guides', count: generated.guides.length });
      }

      setResults(insertResults);
      qc.invalidateQueries({ queryKey: ['kb-articles'] });
      qc.invalidateQueries({ queryKey: ['kb-faqs-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-field-help-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-guides-admin'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
      toast.success(`Generated ${insertResults.reduce((s, r) => s + r.count, 0)} items`);
    } catch (e: any) {
      console.error('AI generation error:', e);
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Target Module *</Label>
            <Select value={selectedModule} onValueChange={v => { setSelectedModule(v); setSelectedScreens([]); }}>
              <SelectTrigger><SelectValue placeholder="Select a module" /></SelectTrigger>
              <SelectContent>
                {topModules.map(m => (
                  <SelectItem key={m.name} value={m.name}>{m.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedModule && screensForModule.length > 0 && (
            <div>
              <Label>Screens (leave empty for all)</Label>
              <ScrollArea className="h-[150px] rounded-md border p-3">
                <div className="space-y-2">
                  {screensForModule.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedScreens.includes(s.name)}
                        onCheckedChange={() => toggleScreen(s.name)}
                      />
                      <span className="text-sm">{s.display_name}</span>
                      <Badge variant="outline" className="text-xs">{s.route}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div>
            <Label>Content Types to Generate *</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {([
                { key: 'articles' as ContentType, icon: BookOpen, label: 'Articles' },
                { key: 'faqs' as ContentType, icon: HelpCircle, label: 'FAQs' },
                { key: 'field_help' as ContentType, icon: FormInput, label: 'Field Help' },
                { key: 'guides' as ContentType, icon: Route, label: 'Process Guides' },
              ]).map(ct => (
                <button
                  key={ct.key}
                  onClick={() => toggleContentType(ct.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                    contentTypes.includes(ct.key) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <ct.icon className="h-4 w-4" />
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Additional Context (optional)</Label>
            <Textarea
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="Provide any additional context about the module, business rules, or specific areas to cover..."
              rows={4}
            />
          </div>

          {results.length > 0 && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 font-medium text-primary mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Generated Successfully
              </div>
              <div className="space-y-1">
                {results.map(r => (
                  <p key={r.type} className="text-sm text-muted-foreground">
                    {r.count} {r.type} created as drafts
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={generate} disabled={generating || !selectedModule || contentTypes.length === 0} className="gap-2">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
