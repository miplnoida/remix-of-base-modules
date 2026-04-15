import React, { useEffect, useState } from 'react';
import { BookOpen, MessageCircleQuestion, Route, ArrowLeft, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useHelpContext } from './HelpProvider';
import { ProcessGuideViewer } from './ProcessGuideViewer';
import { supabase } from '@/integrations/supabase/client';
import { KBArticle, KBFAQ } from '@/hooks/useScreenHelp';

/** Simple markdown-ish renderer */
function ArticleContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold mt-3 mb-1">{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-semibold mt-4 mb-1">{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold mt-4 mb-2">{trimmed.slice(2)}</h1>);
    } else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <li key={i} className="text-sm ml-4 list-decimal">{renderInline(trimmed.replace(/^\d+\.\s/, ''))}</li>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={i} className="text-sm ml-4 list-disc">{renderInline(trimmed.slice(2))}</li>
      );
    } else if (trimmed.startsWith('`') && trimmed.endsWith('`') && !trimmed.startsWith('```')) {
      elements.push(<code key={i} className="text-sm font-mono bg-muted rounded px-1.5 py-0.5 block my-1">{trimmed.slice(1, -1)}</code>);
    } else if (trimmed.length === 0) {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(trimmed)}</p>);
    }
  });

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold + inline code
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="text-xs font-mono bg-muted rounded px-1 py-0.5">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export function HelpSidebar() {
  const {
    sidebarOpen,
    sidebarView,
    closeSidebar,
    setSidebarView,
    article,
    faqs,
    processGuides,
    selectedSearchResult,
    moduleKey,
  } = useHelpContext();

  // For search result viewing, fetch the full content
  const [searchResultContent, setSearchResultContent] = useState<{
    article?: KBArticle;
    faq?: KBFAQ;
  } | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    if (!selectedSearchResult) {
      setSearchResultContent(null);
      return;
    }

    const fetchResult = async () => {
      setLoadingResult(true);
      try {
        if (selectedSearchResult.content_type === 'article') {
          const { data } = await supabase
            .from('kb_articles')
            .select('*')
            .eq('id', selectedSearchResult.id)
            .maybeSingle();
          setSearchResultContent({ article: data as KBArticle | undefined });
        } else if (selectedSearchResult.content_type === 'faq') {
          const { data } = await supabase
            .from('kb_faqs')
            .select('*')
            .eq('id', selectedSearchResult.id)
            .maybeSingle();
          setSearchResultContent({ faq: data as KBFAQ | undefined });
        }
      } finally {
        setLoadingResult(false);
      }
    };

    fetchResult();
  }, [selectedSearchResult]);

  const tabValue = sidebarView === 'search-result' ? 'search-result' : sidebarView;

  // Count badges
  const faqCount = faqs.length;
  const guideCount = processGuides.length;

  return (
    <Sheet open={sidebarOpen} onOpenChange={(open) => { if (!open) closeSidebar(); }}>
      <SheetContent side="right" className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
        {/* Search result view */}
        {sidebarView === 'search-result' && selectedSearchResult && (
          <div className="p-6">
            <Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-1.5" onClick={() => setSidebarView('article')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            {loadingResult && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingResult && searchResultContent?.article && (
              <>
                <SheetHeader className="mb-3">
                  <SheetTitle className="text-base">{searchResultContent.article.title}</SheetTitle>
                  {searchResultContent.article.summary && (
                    <SheetDescription>{searchResultContent.article.summary}</SheetDescription>
                  )}
                </SheetHeader>
                <Separator className="my-3" />
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ArticleContent content={searchResultContent.article.content} />
                </div>
                {searchResultContent.article.tags && searchResultContent.article.tags.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex flex-wrap gap-1">
                      {searchResultContent.article.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {!loadingResult && searchResultContent?.faq && (
              <>
                <SheetHeader className="mb-3">
                  <SheetTitle className="text-base">FAQ</SheetTitle>
                </SheetHeader>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{searchResultContent.faq.question}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{searchResultContent.faq.answer}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Normal tabbed view */}
        {sidebarView !== 'search-result' && (
          <div className="p-6">
            <Tabs value={tabValue} onValueChange={(v) => setSidebarView(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="article" className="gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" /> Help
                </TabsTrigger>
                <TabsTrigger value="faq" className="gap-1.5 text-xs">
                  <MessageCircleQuestion className="h-3.5 w-3.5" /> FAQ {faqCount > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">{faqCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="guides" className="gap-1.5 text-xs">
                  <Route className="h-3.5 w-3.5" /> Guides {guideCount > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">{guideCount}</Badge>}
                </TabsTrigger>
              </TabsList>

              {/* Article tab */}
              <TabsContent value="article" className="mt-0">
                {article ? (
                  <>
                    <SheetHeader>
                      <SheetTitle className="text-base flex items-center gap-2">
                        {article.title}
                        <Badge variant="secondary" className="text-[10px]">v{article.version}</Badge>
                      </SheetTitle>
                      {article.summary && (
                        <SheetDescription>{article.summary}</SheetDescription>
                      )}
                    </SheetHeader>
                    <Separator className="my-3" />
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ArticleContent content={article.content} />
                    </div>
                    {article.tags && article.tags.length > 0 && (
                      <>
                        <Separator className="my-3" />
                        <div className="flex flex-wrap gap-1">
                          {article.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No help article available for this screen yet.</p>
                  </div>
                )}
              </TabsContent>

              {/* FAQ tab */}
              <TabsContent value="faq" className="mt-0">
                {faqs.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-sm text-left py-3">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap pb-4">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircleQuestion className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No FAQs available for this screen yet.</p>
                  </div>
                )}
              </TabsContent>

              {/* Guides tab */}
              <TabsContent value="guides" className="mt-0">
                {processGuides.length > 0 ? (
                  <div className="space-y-6">
                    {processGuides.map((guide) => (
                      <ProcessGuideViewer key={guide.id} guide={guide} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Route className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No process guides available for this screen yet.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
