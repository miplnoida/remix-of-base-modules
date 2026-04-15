import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KBArticle } from '@/hooks/useScreenHelp';

interface HelpButtonProps {
  article: KBArticle | null;
  variant?: 'icon' | 'button';
  className?: string;
}

export function HelpButton({ article, variant = 'icon', className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  if (!article) return null;

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className={className}
          title="Screen Help"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className={className}
        >
          <BookOpen className="h-4 w-4 mr-1.5" />
          Help
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base flex items-center gap-2">
              {article.title}
              {article.tags && article.tags.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  v{article.version}
                </Badge>
              )}
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
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Simple markdown-ish renderer for article content */
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
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={i} className="text-sm ml-4 list-disc">{renderInline(trimmed.slice(2))}</li>
      );
    } else if (trimmed.length === 0) {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(trimmed)}</p>);
    }
  });

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}
