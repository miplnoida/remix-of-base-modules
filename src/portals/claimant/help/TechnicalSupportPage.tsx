import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, ArrowLeft, Mail, Phone } from 'lucide-react';

const TIPS = [
  { t: 'Trouble signing in', d: 'Use "Forgot password" on the sign-in page. Make sure you use the email you registered with.' },
  { t: 'Page not loading', d: 'Refresh with Ctrl/Cmd + Shift + R. If issues persist, try a different browser (Chrome, Edge, Safari latest version).' },
  { t: 'Uploads failing', d: 'Ensure files are PDF/JPG/PNG and under 10 MB. Avoid special characters in file names.' },
  { t: 'SSN linking pending', d: 'Linking requires staff verification and may take 1–2 business days. You will be notified once approved.' },
];

export default function TechnicalSupportPage() {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link to="/claimant/help"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Help</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> Technical Support</CardTitle>
          <CardDescription>Common fixes for portal, login, and upload issues.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {TIPS.map(t => (
            <div key={t.t} className="rounded-lg border p-4">
              <p className="text-sm font-semibold">{t.t}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.d}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Still need help?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><a href="mailto:support@socialsecurity.kn"><Mail className="h-4 w-4 mr-1" /> support@socialsecurity.kn</a></Button>
          <Button asChild variant="outline" size="sm"><a href="tel:+18694652535"><Phone className="h-4 w-4 mr-1" /> +1 (869) 465-2535</a></Button>
          <Button asChild size="sm"><Link to="/claimant/help/contact">Contact SSB</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
