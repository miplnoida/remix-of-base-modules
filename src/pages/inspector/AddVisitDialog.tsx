import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AddVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddVisitDialog = ({ open, onOpenChange }: AddVisitDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employerName: '',
    visitType: '',
    date: '',
    time: '',
    address: '',
    purpose: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Visit Scheduled",
      description: `Visit to ${formData.employerName} has been added to your plan`,
    });
    onOpenChange(false);
    setFormData({
      employerName: '',
      visitType: '',
      date: '',
      time: '',
      address: '',
      purpose: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule New Visit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employerName">Employer Name</Label>
            <Input
              id="employerName"
              value={formData.employerName}
              onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
              placeholder="Enter employer name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitType">Visit Type</Label>
            <Select
              value={formData.visitType}
              onValueChange={(value) => setFormData({ ...formData, visitType: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visit type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="scouting">Scouting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter location address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Brief description of visit purpose"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Schedule Visit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
