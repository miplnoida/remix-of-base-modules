import { LgDataGrid, type LgColumnDef } from "@/components/legal/grid";

interface Props<T> {
  id: string;
  columns: LgColumnDef<T>[];
  data: T[];
  loading?: boolean;
  fileName?: string;
}

export function ExplorerGridView<T>({ id, columns, data, loading, fileName }: Props<T>) {
  return (
    <LgDataGrid
      id={id}
      columns={columns}
      data={data}
      isLoading={loading}
      exportFilename={fileName || id}
      searchPlaceholder="Search this view…"
    />
  );
}
