import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export const RecordViolationForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employerName: '',
    violationType: '',
    severity: '',
    date: '',
    description: '',
    evidence: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Violation Recorded",
      description: `Violation for ${formData.employerName} has been recorded successfully`,
    });
    navigate('/inspector/violations');
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate('/inspector/violations')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Record Violation</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Violation Details</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="violationType">Violation Type</Label>
              <Select
                value={formData.violationType}
                onValueChange={(value) => setFormData({ ...formData, violationType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select violation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing-records">Missing Records</SelectItem>
                  <SelectItem value="late-filing">Late Filing</SelectItem>
                  <SelectItem value="incomplete-documentation">Incomplete Documentation</SelectItem>
                  <SelectItem value="unregistered-workers">Unregistered Workers</SelectItem>
                  <SelectItem value="incorrect-contributions">Incorrect Contributions</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date Identified</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed description of the violation..."
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence/Notes</Label>
              <Textarea
                id="evidence"
                value={formData.evidence}
                onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                placeholder="Document any evidence or additional notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/inspector/violations')}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Record Violation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
