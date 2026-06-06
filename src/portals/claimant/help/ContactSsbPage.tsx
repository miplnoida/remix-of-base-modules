import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LifeBuoy, Phone, Mail, MapPin, Clock, ArrowLeft, MessageSquare } from 'lucide-react';

export default function ContactSsbPage() {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link to="/claimant/help"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Help</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> Contact Social Security Board</CardTitle>
          <CardDescription>Reach us by phone, email, or visit one of our offices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <a href="tel:+18694652535" className="rounded-lg border p-4 hover:bg-muted/50 transition">
            <div className="flex items-center gap-2 text-sm font-semibold"><Phone className="h-4 w-4 text-primary" /> Customer Service</div>
            <p className="text-sm mt-1">+1 (869) 465-2535</p>
            <p className="text-xs text-muted-foreground mt-1">Mon–Fri, 8:00 AM – 4:00 PM</p>
          </a>
          <a href="mailto:info@socialsecurity.kn" className="rounded-lg border p-4 hover:bg-muted/50 transition">
            <div className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-primary" /> Email</div>
            <p className="text-sm mt-1">info@socialsecurity.kn</p>
            <p className="text-xs text-muted-foreground mt-1">Reply within 1–2 business days</p>
          </a>
          <Link to="/claimant/help/offices" className="rounded-lg border p-4 hover:bg-muted/50 transition">
            <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Office Locations</div>
            <p className="text-sm mt-1">Find your nearest SSB office</p>
            <p className="text-xs text-muted-foreground mt-1">St. Kitts &amp; Nevis</p>
          </Link>
          <Link to="/claimant/comms/inbox" className="rounded-lg border p-4 hover:bg-muted/50 transition">
            <div className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-primary" /> Secure Messages</div>
            <p className="text-sm mt-1">Send a secure message to SSB</p>
            <p className="text-xs text-muted-foreground mt-1">Best for claim-related questions</p>
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Office hours</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Monday – Friday: 8:00 AM – 4:00 PM. Closed on weekends and public holidays.
        </CardContent>
      </Card>
    </div>
  );
}
