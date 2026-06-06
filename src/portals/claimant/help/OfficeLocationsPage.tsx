import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Phone, MapPin, Clock, ArrowLeft } from 'lucide-react';

const OFFICES = [
  {
    name: 'Head Office – Basseterre',
    address: 'Bay Road, Basseterre, St. Kitts',
    phone: '+1 (869) 465-2535',
    hours: 'Mon–Fri, 8:00 AM – 4:00 PM',
  },
  {
    name: 'Sandy Point Sub-Office',
    address: 'Main Street, Sandy Point, St. Kitts',
    phone: '+1 (869) 465-6173',
    hours: 'Mon–Fri, 8:00 AM – 3:00 PM',
  },
  {
    name: 'Nevis Branch – Charlestown',
    address: 'Hamilton House, Charlestown, Nevis',
    phone: '+1 (869) 469-5245',
    hours: 'Mon–Fri, 8:00 AM – 4:00 PM',
  },
];

export default function OfficeLocationsPage() {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link to="/claimant/help"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Help</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Office Locations</CardTitle>
          <CardDescription>Visit any SSB office during business hours.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {OFFICES.map(o => (
            <div key={o.name} className="rounded-lg border p-4">
              <p className="text-sm font-semibold">{o.name}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5" /> {o.address}</div>
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> <a className="hover:underline" href={`tel:${o.phone.replace(/[^+\d]/g, '')}`}>{o.phone}</a></div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {o.hours}</div>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${encodeURIComponent(o.name + ' ' + o.address)}`}>
                  Open in Maps
                </a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
