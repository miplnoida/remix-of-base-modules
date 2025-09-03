
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder: string;
  className?: string;
  dateFormat?: string;
}

export const DatePicker = ({ date, onSelect, placeholder, className, dateFormat = "dd/MM/yyyy" }: DatePickerProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !date && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, dateFormat) : <span>{placeholder}</span>}
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
