import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Calendar } from 'lucide-react';
import { ViolationNote, NoteType } from '@/types/violationNotes';
import { violationNotesService } from '@/services/violationNotesService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ViolationNotesTabProps {
  violationId: string;
}

export function ViolationNotesTab({ violationId }: ViolationNotesTabProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<ViolationNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>(NoteType.INSPECTOR_COMMENT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [violationId]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await violationNotesService.getByViolationId(violationId);
      setNotes(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load notes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newNoteText.trim()) {
      toast({
        title: 'Required',
        description: 'Please enter a comment',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await violationNotesService.create({
        violationId,
        noteType: newNoteType,
        noteText: newNoteText
      });

      toast({
        title: 'Success',
        description: 'Comment added successfully'
      });

      setNewNoteText('');
      setNewNoteType(NoteType.INSPECTOR_COMMENT);
      loadNotes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNoteTypeBadge = (type: NoteType) => {
    switch (type) {
      case NoteType.INSPECTOR_COMMENT:
        return <Badge variant="default">Inspector</Badge>;
      case NoteType.MANAGER_COMMENT:
        return <Badge variant="secondary">Manager</Badge>;
      case NoteType.SYSTEM:
        return <Badge variant="outline">System</Badge>;
      case NoteType.FIELD_NOTE:
        return <Badge className="bg-info/10 text-info">Field Note</Badge>;
      case NoteType.FOLLOW_UP:
        return <Badge className="bg-warning/15 text-warning">Follow-up</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Comment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Note Type</Label>
            <Select value={newNoteType} onValueChange={(value) => setNewNoteType(value as NoteType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NoteType.INSPECTOR_COMMENT}>Inspector Comment</SelectItem>
                <SelectItem value={NoteType.FIELD_NOTE}>Field Note</SelectItem>
                <SelectItem value={NoteType.FOLLOW_UP}>Follow-up</SelectItem>
                <SelectItem value={NoteType.MANAGER_COMMENT}>Manager Comment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Comment</Label>
            <Textarea
              placeholder="Enter your comment or field notes..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={4}
            />
          </div>

          <Button onClick={handleAddComment} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </CardContent>
      </Card>

      {/* Notes Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Notes & Field Comments</CardTitle>
          <p className="text-sm text-muted-foreground">
            Timeline of all comments and notes for this violation
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notes yet. Add the first comment above.
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border-l-4 border-primary pl-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getNoteTypeBadge(note.noteType)}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{note.authorName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(note.createdAt), 'PPp')}</span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
