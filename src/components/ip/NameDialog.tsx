
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NameDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NameDialog = ({ open, onClose }: NameDialogProps) => {
  const [nameDetails, setNameDetails] = useState({
    title: '',
    first: '',
    middle: '',
    surname: '',
    maiden: '',
    suffix: '',
    alias: ''
  });

  const titles = ['Dr.', 'Miss.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.'];
  const suffixes = ['I', 'II', 'III', 'Jr.', 'Sr.'];

  const handleSave = () => {
    console.log('Name details:', nameDetails);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Name Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Select onValueChange={(value) => setNameDetails({...nameDetails, title: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((title) => (
                    <SelectItem key={title} value={title}>{title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>First Name</Label>
              <Input 
                value={nameDetails.first}
                onChange={(e) => setNameDetails({...nameDetails, first: e.target.value})}
                placeholder="Enter first name" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Middle Name</Label>
              <Input 
                value={nameDetails.middle}
                onChange={(e) => setNameDetails({...nameDetails, middle: e.target.value})}
                placeholder="Enter middle name" 
              />
            </div>
            <div>
              <Label>Surname</Label>
              <Input 
                value={nameDetails.surname}
                onChange={(e) => setNameDetails({...nameDetails, surname: e.target.value})}
                placeholder="Enter surname" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Maiden Name</Label>
              <Input 
                value={nameDetails.maiden}
                onChange={(e) => setNameDetails({...nameDetails, maiden: e.target.value})}
                placeholder="Enter maiden name" 
              />
            </div>
            <div>
              <Label>Suffix</Label>
              <Select onValueChange={(value) => setNameDetails({...nameDetails, suffix: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select suffix" />
                </SelectTrigger>
                <SelectContent>
                  {suffixes.map((suffix) => (
                    <SelectItem key={suffix} value={suffix}>{suffix}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Alias</Label>
            <Input 
              value={nameDetails.alias}
              onChange={(e) => setNameDetails({...nameDetails, alias: e.target.value})}
              placeholder="Enter alias" 
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
