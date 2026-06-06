import { useParams, Link } from 'react-router-dom';
import { PortalPublicLayout } from '@/portals/_shared/PortalPublicLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';
import { ClipboardCheck } from 'lucide-react';

/**
 * ExternalTaskLanding — secure deep-link landing for users who arrive via
 * email / SMS link. Token validation, expiry display and start/continue
 * action are all delegated to ExternalTaskForm which calls the backend.
 */
export default function ExternalTaskLanding() {
  const { token } = useParams<{ token: string }>();
  return (
    <PortalPublicLayout brand="Secure Task" role="EXTERNAL TASK">
      <section className="mx-auto max-w-3xl px-4 py-10">
        {!token ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /><CardTitle>Open a secure task</CardTitle></div>
              <CardDescription>Use the link sent to you by email or SMS. Direct access without a token is not permitted.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline"><Link to="/portal">Back to Online Services</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assigned Task</CardTitle>
                <Badge variant="outline">Token verified by server</Badge>
              </div>
              <CardDescription>The task summary, participant role, and expiry date are loaded from the secure API below.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExternalTaskForm taskId={token} />
            </CardContent>
          </Card>
        )}
      </section>
    </PortalPublicLayout>
  );
}
