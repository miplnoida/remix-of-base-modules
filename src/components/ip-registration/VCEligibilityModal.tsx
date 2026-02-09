import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VCEligibilityCheck } from './VCEligibilityCheck';
import { HeartHandshake } from 'lucide-react';

interface VCEligibilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ssn: string;
  personName?: string;
}

export function VCEligibilityModal({ open, onOpenChange, ssn, personName }: VCEligibilityModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            Voluntary Contributor Eligibility
          </DialogTitle>
          <DialogDescription>
            {personName ? `Eligibility check for ${personName}` : 'Check voluntary contributor eligibility'}
            {ssn ? ` (SSN: ${ssn})` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <VCEligibilityCheck ssn={ssn} personName={personName} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
