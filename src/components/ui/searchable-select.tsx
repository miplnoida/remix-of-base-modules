import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string; // additional text to match against during search
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  /** When set, prepends an "All" option with value "" that clears the selection */
  includeAllOption?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
  includeAllOption,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Build effective options list with optional "All" prepended
  const effectiveOptions = React.useMemo(() => {
    if (!includeAllOption) return options;
    return [{ value: "__all__", label: includeAllOption }, ...options];
  }, [options, includeAllOption]);

  const selectedOption = effectiveOptions.find((o) => o.value === (value || (includeAllOption ? "__all__" : "")));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(value, search) => {
            const option = effectiveOptions.find((o) => o.value === value);
            if (!option) return 0;
            const haystack = `${option.label} ${option.searchText || ""}`.toLowerCase();
            if (haystack.includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {effectiveOptions.map((option) => {
                const isSelected = includeAllOption
                  ? (option.value === "__all__" ? !value : value === option.value)
                  : value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      if (includeAllOption && currentValue === "__all__") {
                        onValueChange("");
                      } else {
                        onValueChange(currentValue === value ? "" : currentValue);
                      }
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
