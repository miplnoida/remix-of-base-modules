import React, { useState } from 'react';
import { Search, FileText, MessageCircleQuestion, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useKBSearch, KBSearchResult } from '@/hooks/useKBSearch';
import { useDebounce } from '@/hooks/useDebounce';

interface HelpSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey?: string;
  onSelectResult?: (result: KBSearchResult) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  article: <FileText className="h-4 w-4" />,
  faq: <MessageCircleQuestion className="h-4 w-4" />,
  process_guide: <BookOpen className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  article: 'Article',
  faq: 'FAQ',
  process_guide: 'Guide',
};

export function HelpSearchDialog({ open, onOpenChange, moduleKey, onSelectResult }: HelpSearchDialogProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, 300);
  const { data: results, isLoading } = useKBSearch(debouncedQuery, moduleKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Search Help & Knowledge Base</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, FAQs, guides..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto mt-2 space-y-1 min-h-[200px]">
          {isLoading && debouncedQuery.length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
          )}
          {!isLoading && debouncedQuery.length >= 2 && (!results || results.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
          )}
          {debouncedQuery.length < 2 && (
            <p className="text-sm text-muted-foreground text-center py-8">Type at least 2 characters to search</p>
          )}
          {results?.map((result) => (
            <button
              key={`${result.content_type}-${result.id}`}
              onClick={() => onSelectResult?.(result)}
              className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors flex items-start gap-3"
            >
              <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                {TYPE_ICONS[result.content_type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{result.title}</span>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {TYPE_LABELS[result.content_type] || result.content_type}
                  </Badge>
                </div>
                {result.summary && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{result.summary}</p>
                )}
                {result.module_key && (
                  <span className="text-[10px] text-muted-foreground">{result.module_key}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
