import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StickyNote, Plus } from 'lucide-react';
import { employerObservationService } from '@/services/employerObservationService';
import { EmployerObservation } from '@/types/employerObservation';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ObservationsTabContentProps {
  employerId: string;
  visitId?: string;
}

export function ObservationsTabContent({ employerId, visitId }: ObservationsTabContentProps) {
  const [observations, setObservations] = useState<EmployerObservation[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadObservations();
  }, [employerId, visitId]);

  const loadObservations = async () => {
    setLoading(true);
    try {
      const data = visitId 
        ? await employerObservationService.getByVisitId(visitId)
        : await employerObservationService.getByEmployerId(employerId);
      setObservations(data);
    } catch (error) {
      console.error('Error loading observations:', error);
      toast.error('Failed to load observations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setSubmitting(true);
    try {
      await employerObservationService.create({
        employerId,
        inspectionVisitId: visitId,
        noteText: newNote
      });
      
      toast.success('Note added');
      setNewNote('');
      await loadObservations();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading observations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add New Note */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Add Observation / Internal Note</label>
        <Textarea
          placeholder="Enter your observations, notes, or comments about this employer..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <Button onClick={handleAddNote} disabled={submitting || !newNote.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      <Separator />

      {/* Notes Timeline */}
      <div>
        <h3 className="text-sm font-medium mb-4">Notes History</h3>
        {observations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No observations recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {observations.map((obs) => (
                <div key={obs.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{obs.authorName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(obs.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{obs.noteText}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
