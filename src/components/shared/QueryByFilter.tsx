import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterField {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "daterange";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface QueryByFilterProps {
  fields: FilterField[];
  onFilter: (filters: Record<string, any>) => void;
  onClear?: () => void;
  defaultExpanded?: boolean;
  className?: string;
}

export function QueryByFilter({
  fields,
  onFilter,
  onClear,
  defaultExpanded = false,
  className,
}: QueryByFilterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const handleFieldChange = (fieldName: string, value: any) => {
    const newFilters = { ...filters, [fieldName]: value };
    setFilters(newFilters);
    
    // Count active filters (non-empty values)
    const count = Object.values(newFilters).filter(v => v && v !== "").length;
    setActiveFiltersCount(count);
  };

  const handleApplyFilters = () => {
    onFilter(filters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setActiveFiltersCount(0);
    if (onClear) {
      onClear();
    }
  };

  const renderField = (field: FilterField) => {
    const value = filters[field.name] || "";

    switch (field.type) {
      case "text":
      case "number":
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full min-w-0 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full min-w-0 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full min-w-0 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        );

      case "daterange":
        return (
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="date"
              value={filters[`${field.name}_from`] || ""}
              onChange={(e) => handleFieldChange(`${field.name}_from`, e.target.value)}
              placeholder="From"
              className="flex-1 min-w-[140px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
            <input
              type="date"
              value={filters[`${field.name}_to`] || ""}
              onChange={(e) => handleFieldChange(`${field.name}_to`, e.target.value)}
              placeholder="To"
              className="flex-1 min-w-[140px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn("mb-4", className)}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Query By</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
            {fields.map((field) => (
              <div key={field.name} className={cn("flex flex-col gap-1.5", field.type === "daterange" && "md:col-span-2 lg:col-span-3")}>
                <label className="block text-sm font-medium text-foreground">
                  {field.label}
                </label>
                <div className="w-full">
                  {renderField(field)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              disabled={activeFiltersCount === 0}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApplyFilters}
              disabled={activeFiltersCount === 0}
            >
              <Filter className="h-4 w-4 mr-1" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
