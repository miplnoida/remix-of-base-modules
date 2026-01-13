import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Plus } from 'lucide-react';
import { IPNoteData } from '@/types/ipRegistration';
import { format } from 'date-fns';

interface NotesTabProps {
  notes: IPNoteData[];
  onAddNote: (noteContent: string) => void;
  isEditable: boolean;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  onAddNote,
  isEditable,
}) => {
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Add New Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Note (max 100 characters)</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value.slice(0, 100))}
                placeholder="Enter note..."
                rows={3}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">{newNote.length}/100 characters</p>
            </div>
            <Button onClick={handleAddNote} disabled={!newNote.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes History ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No notes added yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <div key={note.id || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-muted-foreground">
                      {note.note_date 
                        ? format(new Date(note.note_date), 'dd/MM/yyyy HH:mm')
                        : 'Unknown date'}
                    </span>
                    {note.userid && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {note.userid}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{note.note}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
