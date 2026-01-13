import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth, setMonth, setYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerWithDropdownsProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 120 }, (_, i) => currentYear - 100 + i);

export default function DatePickerWithDropdowns({
  date,
  onSelect,
  placeholder = 'Select date',
  className,
  disabled = false,
  minDate,
  maxDate,
  error
}: DatePickerWithDropdownsProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(date || new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(viewDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(viewDate.getFullYear());

  useEffect(() => {
    if (date) {
      setViewDate(date);
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
    }
  }, [date]);

  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month);
    setSelectedMonth(newMonth);
    setViewDate(setMonth(viewDate, newMonth));
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    setSelectedYear(newYear);
    setViewDate(setYear(viewDate, newYear));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(selectedYear, selectedMonth, day);
    
    // Check bounds
    if (minDate && newDate < minDate) return;
    if (maxDate && newDate > maxDate) return;
    
    onSelect(newDate);
    setOpen(false);
  };

  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
  
  const isDateDisabled = (day: number): boolean => {
    const checkDate = new Date(selectedYear, selectedMonth, day);
    if (minDate && checkDate < minDate) return true;
    if (maxDate && checkDate > maxDate) return true;
    return false;
  };

  const isDateSelected = (day: number): boolean => {
    if (!date) return false;
    return (
      date.getDate() === day &&
      date.getMonth() === selectedMonth &&
      date.getFullYear() === selectedYear
    );
  };

  const formatDisplayDate = (d: Date): string => {
    return format(d, 'dd/MM/yyyy');
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? formatDisplayDate(date) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            {/* Month/Year Dropdowns */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div
                  key={day}
                  className="h-8 w-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first of the month */}
              {Array.from({ length: firstDayOfMonth }, (_, i) => (
                <div key={`empty-${i}`} className="h-8 w-8" />
              ))}
              
              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const disabled = isDateDisabled(day);
                const selected = isDateSelected(day);
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !disabled && handleDateClick(day)}
                    disabled={disabled}
                    className={cn(
                      "h-8 w-8 rounded-md text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                      disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                      !selected && !disabled && "text-foreground"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Today Button */}
            <div className="mt-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const today = new Date();
                  onSelect(today);
                  setSelectedMonth(today.getMonth());
                  setSelectedYear(today.getFullYear());
                  setViewDate(today);
                  setOpen(false);
                }}
              >
                Today
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
