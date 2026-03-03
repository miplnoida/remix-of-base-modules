import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onTaskCreated?: () => void;
  onCreateTask?: (caseId: string, task: any) => void;
}

export function CreateTaskDialog({ open, onOpenChange, caseId, onTaskCreated, onCreateTask }: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title || title.trim().length === 0) newErrors.title = "Task title is required";
    if (!owner) newErrors.owner = "Task owner is required";
    if (!priority) newErrors.priority = "Priority is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (onCreateTask) {
      onCreateTask(caseId, {
        title: title.trim(),
        owner,
        dueOn: dueOn || undefined,
        priority,
        status: "To Do" as const,
        description: description.trim() || undefined
      });
    }
    
    onTaskCreated?.();
    toast.success("Task created successfully");
    onOpenChange(false);
    
    // Reset form
    setTitle("");
    setOwner("");
    setDueOn("");
    setPriority("");
    setDescription("");
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review case documents"
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label htmlFor="owner">Assigned To *</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger id="owner" className={errors.owner ? "border-destructive" : ""}>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Maria Garcia">Maria Garcia</SelectItem>
                <SelectItem value="John Thompson">John Thompson</SelectItem>
                <SelectItem value="Sarah Williams">Sarah Williams</SelectItem>
                <SelectItem value="David Chen">David Chen</SelectItem>
                <SelectItem value="Lisa Anderson">Lisa Anderson</SelectItem>
              </SelectContent>
            </Select>
            {errors.owner && <p className="text-xs text-destructive mt-1">{errors.owner}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority" className={errors.priority ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
            </div>
            <div>
              <Label htmlFor="dueOn">Due Date</Label>
              <Input
                id="dueOn"
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description or notes"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
