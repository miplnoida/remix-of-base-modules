import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

interface KBContentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  title?: string;
}

export function KBContentPreview({ open, onOpenChange, content, title = 'Content Preview' }: KBContentPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
