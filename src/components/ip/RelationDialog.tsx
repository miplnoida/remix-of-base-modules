
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RelationDialogProps {
  open: boolean;
  onClose: () => void;
  onAddRelation: (relation: any) => void;
}

export const RelationDialog = ({ open, onClose, onAddRelation }: RelationDialogProps) => {
  const [relationType, setRelationType] = useState<string>('');
  const [relationData, setRelationData] = useState<any>({});

  const DatePicker = ({ date, onSelect, placeholder }: { date?: Date, onSelect: (date: Date | undefined) => void, placeholder: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  const handleSave = () => {
    const relation = {
      id: Date.now().toString(),
      type: relationType,
      data: relationData
    };
    onAddRelation(relation);
    setRelationType('');
    setRelationData({});
    onClose();
  };

  const renderRelationFields = () => {
    switch (relationType) {
      case 'beneficiary':
        return (
          <div className="space-y-4">
            <div>
              <Label>Beneficiary's Name</Label>
              <Input 
                value={relationData.name || ''}
                onChange={(e) => setRelationData({...relationData, name: e.target.value})}
                placeholder="Enter beneficiary's name" 
              />
            </div>
            <div>
              <Label>Beneficiary's Address</Label>
              <Textarea 
                value={relationData.address || ''}
                onChange={(e) => setRelationData({...relationData, address: e.target.value})}
                placeholder="Enter beneficiary's address" 
              />
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <Label>Contact Name</Label>
              <Input 
                value={relationData.name || ''}
                onChange={(e) => setRelationData({...relationData, name: e.target.value})}
                placeholder="Enter contact name" 
              />
            </div>
            <div>
              <Label>Contact Relation</Label>
              <Input 
                value={relationData.relation || ''}
                onChange={(e) => setRelationData({...relationData, relation: e.target.value})}
                placeholder="e.g., Sister, Mother" 
              />
            </div>
            <div>
              <Label>Contact Address</Label>
              <Textarea 
                value={relationData.address || ''}
                onChange={(e) => setRelationData({...relationData, address: e.target.value})}
                placeholder="Enter contact address" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Contact Phone Number</Label>
                <Input 
                  value={relationData.phone || ''}
                  onChange={(e) => setRelationData({...relationData, phone: e.target.value})}
                  placeholder="+1 869 xxx-xxxx" 
                />
              </div>
              <div>
                <Label>Contact Mobile Number</Label>
                <Input 
                  value={relationData.mobile || ''}
                  onChange={(e) => setRelationData({...relationData, mobile: e.target.value})}
                  placeholder="+1 869 xxx-xxxx" 
                />
              </div>
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input 
                value={relationData.email || ''}
                onChange={(e) => setRelationData({...relationData, email: e.target.value})}
                placeholder="contact@email.com"
                type="email"
              />
            </div>
          </div>
        );

      case 'parent':
        return (
          <div className="space-y-4">
            <div>
              <Label>Father's Name</Label>
              <Input 
                value={relationData.fatherName || ''}
                onChange={(e) => setRelationData({...relationData, fatherName: e.target.value})}
                placeholder="Enter father's name" 
              />
            </div>
            <div>
              <Label>Mother's Name</Label>
              <Input 
                value={relationData.motherName || ''}
                onChange={(e) => setRelationData({...relationData, motherName: e.target.value})}
                placeholder="Enter mother's name" 
              />
            </div>
          </div>
        );

      case 'spouse':
        return (
          <div className="space-y-4">
            <div>
              <Label>Spouse Name</Label>
              <Input 
                value={relationData.name || ''}
                onChange={(e) => setRelationData({...relationData, name: e.target.value})}
                placeholder="Enter spouse name" 
              />
            </div>
            <div>
              <Label>Spouse Address</Label>
              <Textarea 
                value={relationData.address || ''}
                onChange={(e) => setRelationData({...relationData, address: e.target.value})}
                placeholder="Enter spouse address" 
              />
            </div>
            <div>
              <Label>Spouse Date of Birth</Label>
              <DatePicker
                date={relationData.dob}
                onSelect={(date) => setRelationData({...relationData, dob: date})}
                placeholder="Select spouse date of birth"
              />
            </div>
            <div>
              <Label>Spouse SSN (6 digits)</Label>
              <Input 
                value={relationData.ssn || ''}
                onChange={(e) => setRelationData({...relationData, ssn: e.target.value})}
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>
          </div>
        );

      case 'witness':
        return (
          <div className="space-y-4">
            <div>
              <Label>Witness Name</Label>
              <Input 
                value={relationData.name || ''}
                onChange={(e) => setRelationData({...relationData, name: e.target.value})}
                placeholder="Enter witness name" 
              />
            </div>
            <div>
              <Label>Date of Witnessed</Label>
              <DatePicker
                date={relationData.dateWitnessed}
                onSelect={(date) => setRelationData({...relationData, dateWitnessed: date})}
                placeholder="Select date witnessed"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Relation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Relation Type</Label>
            <Select onValueChange={(value) => {
              setRelationType(value);
              setRelationData({});
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select relation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beneficiary">Beneficiary</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="witness">Witness</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {relationType && renderRelationFields()}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!relationType}>Add Relation</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
