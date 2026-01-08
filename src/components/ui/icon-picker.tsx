import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LUCIDE_ICONS } from '@/data/lucideIcons';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Search } from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function IconPicker({ value, onChange, placeholder = 'Select icon...' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search) return LUCIDE_ICONS;
    return LUCIDE_ICONS.filter(icon =>
      icon.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  const SelectedIcon = getIcon(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            {value ? (
              <>
                <SelectedIcon className="h-4 w-4" />
                <span>{value}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-4 gap-1 p-2">
            {filteredIcons.map((iconName) => {
              const Icon = getIcon(iconName);
              return (
                <button
                  key={iconName}
                  onClick={() => {
                    onChange(iconName);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors',
                    value === iconName && 'bg-primary text-primary-foreground'
                  )}
                  title={iconName}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No icons found
            </p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
