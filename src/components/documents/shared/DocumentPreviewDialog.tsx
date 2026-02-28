import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle } from 'lucide-react';
import { PreviewDoc } from './types';

interface DocumentPreviewDialogProps {
  open: boolean;
  previewDoc: PreviewDoc | null;
  onClose: () => void;
}

export function DocumentPreviewDialog({ open, previewDoc, onClose }: DocumentPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {previewDoc?.name || 'Document Preview'}
          </DialogTitle>
          <DialogDescription>Secure document preview</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          {previewDoc?.category === 'pdf' && (
            <object
              data={previewDoc.url}
              type="application/pdf"
              className="w-full h-[70vh] border rounded-lg"
              title={previewDoc.name}
            >
              <iframe
                src={previewDoc.url}
                className="w-full h-[70vh] border rounded-lg"
                title={previewDoc.name}
              />
            </object>
          )}
          {previewDoc?.category === 'image' && (
            <div className="flex items-center justify-center p-4">
              <img
                src={previewDoc.url}
                alt={previewDoc.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
          )}
          {previewDoc?.category === 'other' && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
              <p className="font-medium text-lg">Preview not available</p>
              <p className="text-sm mt-1 mb-4">This file format cannot be previewed in the browser.</p>
              <Button
                variant="default"
                onClick={() => {
                  if (previewDoc.url) {
                    const link = document.createElement('a');
                    link.href = previewDoc.url;
                    link.download = previewDoc.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Instead
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
