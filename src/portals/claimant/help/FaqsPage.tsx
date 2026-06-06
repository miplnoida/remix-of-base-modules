import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowLeft } from 'lucide-react';

const FAQS: { q: string; a: string; cat: string }[] = [
  { cat: 'Account', q: 'How do I link my SSN to my account?', a: 'Go to My Social Security → Link SSN, enter your 6-digit SSN and verification details. Once approved by SSB staff, eligible benefits will unlock.' },
  { cat: 'Account', q: 'I forgot my password. What do I do?', a: 'Use the "Forgot password" link on the sign-in page. A reset link will be sent to your registered email.' },
  { cat: 'Applications', q: 'How do I apply for a benefit?', a: 'Open Apply from the sidebar, pick the benefit, and complete the guided form. You can save and resume at any time.' },
  { cat: 'Applications', q: 'Why is a benefit disabled for me?', a: 'Some benefits require a linked SSN, a specific role (e.g., representative for a deceased person), or additional verification. The card explains the exact reason.' },
  { cat: 'Documents', q: 'What document formats are accepted?', a: 'PDF, JPG, and PNG up to 10 MB per file. Make sure scans are clear and complete.' },
  { cat: 'Claims', q: 'How do I check my claim status?', a: 'Open Claims from the sidebar. Each claim shows its current stage, next required action, and any messages from SSB.' },
  { cat: 'Payments', q: 'How do I update my bank details?', a: 'Go to More → Bank / EFT Update. Submit your preferred payout method; SSB staff will review and approve.' },
];

export default function FaqsPage() {
  const [q, setQ] = useState('');
  const filtered = FAQS.filter(f =>
    !q || f.q.toLowerCase().includes(q.toLowerCase()) || f.a.toLowerCase().includes(q.toLowerCase()) || f.cat.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm"><Link to="/claimant/help"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Help</Link></Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions</CardTitle>
          <CardDescription>Browse common questions or search below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search FAQs…" value={q} onChange={e => setQ(e.target.value)} />
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results. Try a different keyword or <Link className="text-primary underline" to="/claimant/help/contact">contact SSB</Link>.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filtered.map((f, i) => (
                <AccordionItem key={i} value={`q-${i}`}>
                  <AccordionTrigger className="text-left">
                    <span className="flex flex-col items-start">
                      <span className="text-xs text-muted-foreground">{f.cat}</span>
                      <span className="text-sm font-medium">{f.q}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
