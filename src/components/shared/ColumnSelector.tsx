import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Columns3, Eye, EyeOff } from "lucide-react";

export interface Column {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Locked columns cannot be hidden
}

interface ColumnSelectorProps {
  columns: Column[];
  onColumnChange: (columns: Column[]) => void;
}

export function ColumnSelector({ columns, onColumnChange }: ColumnSelectorProps) {
  const [localColumns, setLocalColumns] = useState(columns);

  const handleToggleColumn = (key: string) => {
    const updatedColumns = localColumns.map((col) =>
      col.key === key && !col.locked ? { ...col, visible: !col.visible } : col
    );
    setLocalColumns(updatedColumns);
    onColumnChange(updatedColumns);
  };

  const handleShowAll = () => {
    const updatedColumns = localColumns.map((col) => ({ ...col, visible: true }));
    setLocalColumns(updatedColumns);
    onColumnChange(updatedColumns);
  };

  const handleHideAll = () => {
    const updatedColumns = localColumns.map((col) =>
      col.locked ? col : { ...col, visible: false }
    );
    setLocalColumns(updatedColumns);
    onColumnChange(updatedColumns);
  };

  const visibleCount = localColumns.filter((col) => col.visible).length;
  const totalCount = localColumns.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="h-4 w-4 mr-2" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background z-50">
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="flex gap-1 px-2 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowAll}
            className="flex-1 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Show All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHideAll}
            className="flex-1 text-xs"
          >
            <EyeOff className="h-3 w-3 mr-1" />
            Hide All
          </Button>
        </div>

        <DropdownMenuSeparator />

        <div className="max-h-64 overflow-y-auto">
          {localColumns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.key}
              checked={column.visible}
              onCheckedChange={() => handleToggleColumn(column.key)}
              disabled={column.locked}
              className="cursor-pointer"
            >
              <span className="flex-1">{column.label}</span>
              {column.locked && (
                <span className="text-xs text-muted-foreground ml-2">(locked)</span>
              )}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
