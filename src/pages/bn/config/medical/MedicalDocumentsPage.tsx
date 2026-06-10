import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Medical document requirements are managed by the Documents module via the
 * shared Document Setup configuration. This page is a deep-link bridge that
 * keeps the navigation consistent inside Medical Benefit Setup without
 * duplicating Document module functionality.
 */
export default function MedicalDocumentsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Medical Documents</h1>
          <p className="t-page-subtitle mt-1">Document requirements per procedure and jurisdiction.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where to configure</CardTitle>
          <CardDescription>
            Per the architecture, document rules are managed in the shared Documents foundation and
            the Benefit Document Setup screen. Use the links below to manage medical document profiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <div className="font-medium">Benefit Document Setup</div>
              <div className="text-xs text-muted-foreground">Configure profiles and per-procedure document rules.</div>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/bn/config/document-setup">Open <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <div className="font-medium">Service Document Types</div>
              <div className="text-xs text-muted-foreground">Registry of medical certificates and supporting document types.</div>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/bn/config/service-doc-types">Open <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
