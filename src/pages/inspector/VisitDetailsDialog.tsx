import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Calendar } from 'lucide-react';

interface VisitDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: {
    id: string;
    employer: string;
    type: string;
    scheduledTime: string;
    address: string;
    status: string;
  } | null;
}

export const VisitDetailsDialog = ({ open, onOpenChange, visit }: VisitDetailsDialogProps) => {
  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Visit Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{visit.employer}</h3>
            <Badge variant="outline" className="mt-1">
              {visit.type}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Scheduled Time:</span>
              <span className="font-medium">{visit.scheduledTime}</span>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Location:</span>
                <p className="font-medium mt-1">{visit.address}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={visit.status === 'ready' ? 'default' : 'secondary'}>
                {visit.status}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm mb-2">Visit Purpose</h4>
            <p className="text-sm text-muted-foreground">
              Routine compliance inspection to verify employee records, wage documentation, and contribution submissions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
