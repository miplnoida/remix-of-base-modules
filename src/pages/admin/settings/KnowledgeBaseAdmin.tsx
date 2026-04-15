import React, { useState } from 'react';
import { PageHeader } from '@/components/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, HelpCircle, FormInput, Route, BarChart3, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KBArticleManager } from '@/components/admin/kb/KBArticleManager';
import { KBFAQManager } from '@/components/admin/kb/KBFAQManager';
import { KBFieldHelpManager } from '@/components/admin/kb/KBFieldHelpManager';
import { KBProcessGuideManager } from '@/components/admin/kb/KBProcessGuideManager';
import { KBAIGenerator } from '@/components/admin/kb/KBAIGenerator';

export default function KnowledgeBaseAdmin() {
  const [activeTab, setActiveTab] = useState('articles');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['kb-stats'],
    queryFn: async () => {
      const [articles, faqs, fields, guides] = await Promise.all([
        supabase.from('kb_articles').select('id', { count: 'exact', head: true }),
        supabase.from('kb_faqs').select('id', { count: 'exact', head: true }),
        supabase.from('kb_field_help').select('id', { count: 'exact', head: true }),
        supabase.from('kb_process_guides').select('id', { count: 'exact', head: true }),
      ]);
      return {
        articles: articles.count ?? 0,
        faqs: faqs.count ?? 0,
        fields: fields.count ?? 0,
        guides: guides.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Knowledge Base Management"
          description="Create and manage help articles, FAQs, field help, and process guides for all modules"
          icon={BookOpen}
        />
        <Button onClick={() => setAiDialogOpen(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Generate Content
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Articles', count: stats?.articles ?? 0, icon: BookOpen, tab: 'articles' },
          { label: 'FAQs', count: stats?.faqs ?? 0, icon: HelpCircle, tab: 'faqs' },
          { label: 'Field Help', count: stats?.fields ?? 0, icon: FormInput, tab: 'field-help' },
          { label: 'Process Guides', count: stats?.guides ?? 0, icon: Route, tab: 'guides' },
        ].map(s => (
          <button
            key={s.tab}
            onClick={() => setActiveTab(s.tab)}
            className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
              activeTab === s.tab ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            }`}
          >
            <s.icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="articles" className="gap-2">
            <BookOpen className="h-4 w-4" /> Articles
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-2">
            <HelpCircle className="h-4 w-4" /> FAQs
          </TabsTrigger>
          <TabsTrigger value="field-help" className="gap-2">
            <FormInput className="h-4 w-4" /> Field Help
          </TabsTrigger>
          <TabsTrigger value="guides" className="gap-2">
            <Route className="h-4 w-4" /> Process Guides
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles"><KBArticleManager /></TabsContent>
        <TabsContent value="faqs"><KBFAQManager /></TabsContent>
        <TabsContent value="field-help"><KBFieldHelpManager /></TabsContent>
        <TabsContent value="guides"><KBProcessGuideManager /></TabsContent>
      </Tabs>

      <KBAIGenerator open={aiDialogOpen} onOpenChange={setAiDialogOpen} />
    </div>
  );
}
