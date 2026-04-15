import React from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { KBFAQ } from '@/hooks/useScreenHelp';

interface ScreenFAQPanelProps {
  faqs: KBFAQ[];
  title?: string;
}

export function ScreenFAQPanel({ faqs, title = 'Frequently Asked Questions' }: ScreenFAQPanelProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger className="text-sm text-left py-2">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
