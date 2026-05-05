import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
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

export interface CreatableOption {
  value: string;
  label: string;
}

interface CreatableSearchableSelectProps {
  options: CreatableOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Called when user selects "+ Create <typed>". Should resolve to the canonical value to select. */
  onCreate?: (raw: string) => Promise<string | void> | string | void;
  /** When false, the create row is hidden (existing values still selectable). */
  canCreate?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  notAllowedMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function CreatableSearchableSelect({
  options,
  value,
  onValueChange,
  onCreate,
  canCreate = true,
  placeholder = "Select or type to add…",
  searchPlaceholder = "Search or type new value…",
  emptyMessage = "No results.",
  notAllowedMessage = "Category not found — contact audit admin.",
  className,
  disabled = false,
}: CreatableSearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const selected = options.find((o) => o.value === value);

  const trimmed = query.trim();
  const exists = !!options.find(
    (o) => o.label.toLowerCase().trim() === trimmed.toLowerCase()
  );
  const showCreateRow = !!onCreate && canCreate && trimmed.length > 0 && !exists;
  const showNotAllowed = !!onCreate && !canCreate && trimmed.length > 0 && !exists;

  const handleCreate = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    try {
      const resolved = await onCreate(trimmed);
      const finalVal = (resolved as string) || trimmed;
      onValueChange(finalVal);
      setQuery("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
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
          <span className="truncate">{selected ? selected.label : value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[--radix-popover-trigger-width] w-auto max-w-[420px] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              {options
                .filter((o) =>
                  trimmed === ""
                    ? true
                    : o.label.toLowerCase().includes(trimmed.toLowerCase())
                )
                .map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onValueChange(option.value);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="whitespace-normal break-words">{option.label}</span>
                  </CommandItem>
                ))}
              {showCreateRow && (
                <CommandItem
                  key="__create__"
                  value="__create__"
                  onSelect={handleCreate}
                  disabled={creating}
                  className="text-primary"
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  <span>Create &quot;{trimmed}&quot;</span>
                </CommandItem>
              )}
              {showNotAllowed && (
                <CommandEmpty>{notAllowedMessage}</CommandEmpty>
              )}
              {!showCreateRow && !showNotAllowed && trimmed.length > 0 && !exists && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
