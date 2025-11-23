import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Link2, AlertCircle, MapPin, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UnlinkedViolation {
  id: string;
  businessName: string;
  location: string;
  territory: 'St Kitts' | 'Nevis';
  violationType: string;
  approximateEmployees: number;
  observations: string;
  createdAt: string;
  inspectorName: string;
}

interface UnlinkedViolationsPanelProps {
  violations: UnlinkedViolation[];
  onLinkViolation: (violationId: string, employerId: string) => void;
}

export function UnlinkedViolationsPanel({ violations, onLinkViolation }: UnlinkedViolationsPanelProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<UnlinkedViolation | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedEmployerId, setSelectedEmployerId] = useState('');

  const filteredViolations = violations.filter(v =>
    v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.violationType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLinkClick = (violation: UnlinkedViolation) => {
    setSelectedViolation(violation);
    setLinkDialogOpen(true);
  };

  const handleConfirmLink = () => {
    if (!selectedViolation || !selectedEmployerId) {
      toast({
        title: 'Missing Information',
        description: 'Please select an employer',
        variant: 'destructive'
      });
      return;
    }

    onLinkViolation(selectedViolation.id, selectedEmployerId);
    setLinkDialogOpen(false);
    setSelectedViolation(null);
    setSelectedEmployerId('');

    toast({
      title: 'Violation Linked',
      description: `Violation ${selectedViolation.id} has been linked to employer ${selectedEmployerId}`
    });
  };

  const getViolationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      UNREGISTERED_OPERATION: 'Unregistered Operation',
      UNREPORTED_EMPLOYEES: 'Unreported Employees',
      NON_NATIONALS_NO_PERMIT: 'Non-Nationals No Permit',
      FALSE_DECLARATIONS: 'False Declarations',
      UNREGISTERED_ACTIVITY: 'Unregistered Activity',
      OTHER: 'Other'
    };
    return labels[type] || type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Unlinked Scouting Violations ({violations.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Violations discovered during scouting that have not been linked to registered employers
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by business name, location, or violation type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredViolations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No violations match your search' : 'No unlinked violations found'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business / Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Violation Type</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Discovered By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredViolations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{violation.businessName}</p>
                          <p className="text-xs text-muted-foreground">ID: {violation.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground mt-1" />
                          <span className="text-sm">{violation.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{violation.territory}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {getViolationTypeLabel(violation.violationType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">~{violation.approximateEmployees}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{violation.inspectorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(violation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkClick(violation)}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Link to Employer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link to Employer Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Violation to Employer</DialogTitle>
            <DialogDescription>
              Connect this scouting violation to a registered employer
            </DialogDescription>
          </DialogHeader>

          {selectedViolation && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedViolation.businessName}</p>
                    <p className="text-sm text-muted-foreground">{selectedViolation.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{selectedViolation.territory}</Badge>
                  <Badge variant="secondary">{getViolationTypeLabel(selectedViolation.violationType)}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Employer ID / Registration Number</label>
                <Input
                  placeholder="Enter employer registration number"
                  value={selectedEmployerId}
                  onChange={(e) => setSelectedEmployerId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can search for the employer or enter their registration number directly
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmLink}>
              <Link2 className="h-4 w-4 mr-2" />
              Link Violation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
