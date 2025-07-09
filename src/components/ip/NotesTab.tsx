
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  noteDate: Date;
  note: string;
  userId: string;
  createdAt: Date;
}

export const NotesTab = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Note>>({
    noteDate: new Date(),
    userId: 'current-user'
  });

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

  const handleAddNote = () => {
    if (newNote.note && newNote.noteDate) {
      const note: Note = {
        id: Date.now().toString(),
        noteDate: newNote.noteDate,
        note: newNote.note,
        userId: newNote.userId || 'current-user',
        createdAt: new Date()
      };
      setNotes([note, ...notes]);
      setNewNote({ noteDate: new Date(), userId: 'current-user' });
      setShowAddForm(false);
    }
  };

  const removeNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Notes
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Note Form */}
          {showAddForm && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Add New Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Note Date *</Label>
                    <DatePicker
                      date={newNote.noteDate}
                      onSelect={(date) => setNewNote({...newNote, noteDate: date || new Date()})}
                      placeholder="Select note date"
                    />
                  </div>
                  <div>
                    <Label>User ID *</Label>
                    <Input 
                      value={newNote.userId || ''}
                      onChange={(e) => setNewNote({...newNote, userId: e.target.value})}
                      placeholder="Enter user ID" 
                    />
                  </div>
                </div>

                <div>
                  <Label>Note *</Label>
                  <Textarea 
                    value={newNote.note || ''}
                    onChange={(e) => setNewNote({...newNote, note: e.target.value})}
                    placeholder="Enter note content"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddNote} disabled={!newNote.note || !newNote.noteDate}>
                    Add Note
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No notes added yet</p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="font-semibold">
                              {format(note.noteDate, 'PPP')}
                            </span>
                            <span className="text-sm text-gray-500">
                              User: {note.userId}
                            </span>
                            <span className="text-sm text-gray-500">
                              Created: {format(note.createdAt, 'PPP')}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => removeNote(note.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
