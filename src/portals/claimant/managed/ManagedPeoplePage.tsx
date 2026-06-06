import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';

export default function ManagedPeoplePage() {
  const { persona, isLoading } = useClaimantPersona();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const people = persona?.managedPersons ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>People I Manage</CardTitle>
        <CardDescription>
          Insured persons you act for as guardian, payee or authorised representative.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don't manage anyone yet. Once a guardian, payee or representative link is verified, the person will appear here.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SSN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Your role</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map(p => (
                <TableRow key={`${p.ssn}-${p.relationship}`}>
                  <TableCell className="font-mono">{p.ssn}</TableCell>
                  <TableCell>{p.displayName ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline">{p.relationship}</Badge></TableCell>
                  <TableCell>
                    <Link to={`/claimant/managed/people/${p.ssn}`} className="text-primary hover:underline text-sm">
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
