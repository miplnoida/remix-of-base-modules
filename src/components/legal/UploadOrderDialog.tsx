import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onOrderUploaded: () => void;
}

export function UploadOrderDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  onOrderUploaded 
}: UploadOrderDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [orderType, setOrderType] = useState('');
  const [orderDate, setOrderDate] = useState<Date>();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!orderType) {
      toast.error('Please select an order type');
      return;
    }

    if (!orderDate) {
      toast.error('Please select an order date');
      return;
    }

    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      // In real implementation, call ordersAdapter.upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Order uploaded successfully`);
      onOrderUploaded();
      handleClose();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setOrderType('');
    setOrderDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Order Type *</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger>
                <SelectValue placeholder="Select order type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Judgment">Judgment</SelectItem>
                <SelectItem value="Enforcement">Enforcement</SelectItem>
                <SelectItem value="Interim Order">Interim Order</SelectItem>
                <SelectItem value="Final Order">Final Order</SelectItem>
                <SelectItem value="Compliance Order">Compliance Order</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Order Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !orderDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {orderDate ? format(orderDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={orderDate}
                  onSelect={setOrderDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Document File *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="order-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="order-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a file or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF or Word documents
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
