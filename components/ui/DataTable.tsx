import { ReactNode } from "react";

type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  hide?: "sm" | "md" | "lg";
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
};

export function DataTable<T extends object>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-text-secondary">
            {columns.map((col) => {
              const hideClass = col.hide === "sm" ? "hidden sm:table-cell"
                : col.hide === "md" ? "hidden md:table-cell"
                : col.hide === "lg" ? "hidden lg:table-cell"
                : "";
              const isActive = sortKey === col.key;
              return (
                <th key={col.key} className={`${hideClass} px-3 py-3 first:pl-0 last:pr-0`}>
                  {col.sortable && onSort ? (
                    <button
                      onClick={() => onSort(col.key)}
                      className={`flex items-center gap-1 whitespace-nowrap transition-colors ${
                        isActive ? "text-accent" : "hover:text-text-primary"
                      }`}
                    >
                      {col.label}
                      {isActive && (
                        <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  ) : (
                    <span className="whitespace-nowrap">{col.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={(row as Record<string, unknown>).id as string ?? `row-${i}`}
              className={`border-b border-border/30 transition-colors hover:bg-bg-hover/50 ${
                i % 2 === 1 ? "bg-bg-surface/30" : ""
              }`}
            >
              {columns.map((col) => {
                const hideClass = col.hide === "sm" ? "hidden sm:table-cell"
                  : col.hide === "md" ? "hidden md:table-cell"
                  : col.hide === "lg" ? "hidden lg:table-cell"
                  : "";
                return (
                  <td key={col.key} className={`${hideClass} px-3 py-3 first:pl-0 last:pr-0`}>
                    {col.render(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
