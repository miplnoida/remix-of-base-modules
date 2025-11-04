import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CaseNotesTabProps {
  caseData: MockCase;
}

const mockNotes = [
  {
    id: 1,
    content: "Initial consultation completed. All necessary documentation received from applicant.",
    author: "Legal Officer Sarah Johnson",
    createdAt: "2025-01-15T10:30:00",
    updatedAt: "2025-01-15T10:30:00"
  },
  {
    id: 2,
    content: "Follow-up required with respondent regarding missing employment records. Deadline set for Feb 1, 2025.",
    author: "Legal Officer Michael Chen",
    createdAt: "2025-01-20T14:45:00",
    updatedAt: "2025-01-20T14:45:00"
  },
  {
    id: 3,
    content: "Case conference held with all parties. Settlement discussions progressing favorably.",
    author: "Senior Counsel David Lee",
    createdAt: "2025-01-25T09:15:00",
    updatedAt: "2025-01-25T11:20:00"
  }
];

export function CaseNotesTab({ caseData }: CaseNotesTabProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");

  const handleAddNote = () => {
    if (newNote.trim()) {
      toast.success("Note added successfully");
      setNewNote("");
      setIsAddingNote(false);
    }
  };

  const handleEdit = (noteId: number) => {
    toast.info("Edit note dialog would open here");
  };

  const handleDelete = (noteId: number) => {
    toast.error("Delete confirmation would appear here");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Case Notes</h2>
        {!isAddingNote && (
          <Button onClick={() => setIsAddingNote(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Note
          </Button>
        )}
      </div>

      {isAddingNote && (
        <Card>
          <CardHeader>
            <CardTitle>New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddingNote(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNote}>
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {mockNotes.map((note) => (
          <Card key={note.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <p className="text-sm leading-relaxed">{note.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">{note.author}</span>
                    <span>•</span>
                    <span>
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {note.updatedAt !== note.createdAt && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">Edited</Badge>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(note.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
