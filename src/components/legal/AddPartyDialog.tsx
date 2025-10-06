import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { peopleAdapter } from "@/adapters/peopleAdapter";
import { employersAdapter } from "@/adapters/employersAdapter";

interface AddPartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onPartyAdded: () => void;
}

export function AddPartyDialog({ open, onOpenChange, caseId, onPartyAdded }: AddPartyDialogProps) {
  const [lookupType, setLookupType] = useState<'employer' | 'insured'>('employer');
  const [lookupQuery, setLookupQuery] = useState('');
  const [foundParty, setFoundParty] = useState<any>(null);
  const [role, setRole] = useState('Respondent');
  const [isSearching, setIsSearching] = useState(false);

  const handleLookup = async () => {
    if (!lookupQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      if (lookupType === 'employer') {
        const employer = await employersAdapter.getEmployer(lookupQuery);
        if (employer) {
          setFoundParty({ ...employer, type: 'employer' });
          toast.success('Employer found');
        } else {
          toast.error('Employer not found');
          setFoundParty(null);
        }
      } else {
        const person = await peopleAdapter.getPerson(lookupQuery);
        if (person) {
          setFoundParty({ ...person, type: 'insured' });
          toast.success('Person found');
        } else {
          toast.error('Person not found');
          setFoundParty(null);
        }
      }
    } catch (error) {
      toast.error('Lookup failed');
      setFoundParty(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddParty = () => {
    if (!foundParty) {
      toast.error('Please lookup a party first');
      return;
    }

    // In real implementation, this would call an API
    toast.success(`Party added as ${role}`);
    onPartyAdded();
    handleClose();
  };

  const handleClose = () => {
    setLookupQuery('');
    setFoundParty(null);
    setRole('Respondent');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Party to Case</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Search Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={lookupType === 'employer' ? 'default' : 'outline'}
                onClick={() => setLookupType('employer')}
                className="flex-1"
              >
                Employer
              </Button>
              <Button
                type="button"
                variant={lookupType === 'insured' ? 'default' : 'outline'}
                onClick={() => setLookupType('insured')}
                className="flex-1"
              >
                Insured Person
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{lookupType === 'employer' ? 'Registration Number' : 'SSN'}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={lookupType === 'employer' ? 'Enter Reg No' : 'Enter SSN'}
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
              <Button onClick={handleLookup} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {foundParty && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{foundParty.name}</span>
                <Badge>{foundParty.type === 'employer' ? 'Employer' : 'Insured'}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {foundParty.type === 'employer' ? `Reg: ${foundParty.regNo}` : `SSN: ${foundParty.ssn}`}
              </div>
              {foundParty.contact && (
                <div className="text-sm text-muted-foreground">{foundParty.contact}</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Party Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Applicant">Applicant</SelectItem>
                <SelectItem value="Respondent">Respondent</SelectItem>
                <SelectItem value="Defendant">Defendant</SelectItem>
                <SelectItem value="Third Party">Third Party</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAddParty} disabled={!foundParty}>Add Party</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
