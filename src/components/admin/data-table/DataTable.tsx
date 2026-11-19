"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Check,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, type SelectOption } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  emptyMessage?: string;
  enableSelection?: boolean;
  selectedRowIds?: Record<string, boolean>;
  onRowSelectionChange?: (
    rowSelection: Record<string, boolean>,
    selectedRows: TData[]
  ) => void;
  getRowId?: (row: TData, index: number) => string;
}

function TableHeaderCheckbox({ table }: { table: any }) {
  const isAllSelected = table.getIsAllPageRowsSelected();
  const isSomeSelected = table.getIsSomePageRowsSelected();

  return (
    <label
      data-checkbox-container="true"
      className="inline-flex items-center justify-center cursor-pointer select-none"
    >
      <input
        type="checkbox"
        checked={isAllSelected}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        className="sr-only"
        aria-label="Select all rows"
      />
      <div
        className={cn(
          "h-4 w-4 rounded border transition-all flex items-center justify-center cursor-pointer",
          isAllSelected || isSomeSelected
            ? "border-white bg-white text-secondary-800 shadow-xs"
            : "border-white/70 bg-white/15 hover:border-white hover:bg-white/25"
        )}
      >
        {isAllSelected ? (
          <Check
            data-checkbox-icon="true"
            className="h-3 w-3 stroke-[3.5] text-secondary-800"
            style={{ color: "#5a1911", stroke: "#5a1911" }}
          />
        ) : isSomeSelected ? (
          <Minus
            data-checkbox-icon="true"
            className="h-3 w-3 stroke-[3.5] text-secondary-800"
            style={{ color: "#5a1911", stroke: "#5a1911" }}
          />
        ) : null}
      </div>
    </label>
  );
}

function TableRowCheckbox({ row }: { row: any }) {
  const isSelected = row.getIsSelected();

  return (
    <label
      data-checkbox-container="true"
      className="inline-flex items-center justify-center cursor-pointer select-none"
    >
      <input
        type="checkbox"
        checked={isSelected}
        disabled={!row.getCanSelect()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        className="sr-only"
        aria-label="Select row"
      />
      <div
        className={cn(
          "h-4 w-4 rounded border transition-all flex items-center justify-center cursor-pointer",
          isSelected
            ? "border-secondary-600 bg-secondary-600 text-white shadow-xs"
            : "border-neutral-300 bg-white hover:border-secondary-500",
          !row.getCanSelect() && "opacity-50 cursor-not-allowed"
        )}
      >
        {isSelected && (
          <Check
            data-checkbox-icon="row"
            className="h-3 w-3 stroke-[3.5] text-white"
            style={{ color: "#ffffff", stroke: "#ffffff" }}
          />
        )}
      </div>
    </label>
  );
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize: controlledPageSize,
  pageSizeOptions = [10, 20, 30, 50],
  onPageSizeChange,
  page = 1,
  totalPages,
  totalItems,
  onPageChange,
  className,
  emptyMessage = "No results found.",
  enableSelection = true,
  selectedRowIds,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [internalPageSize, setInternalPageSize] = React.useState<number>(
    controlledPageSize ?? 10
  );
  const [internalPage, setInternalPage] = React.useState<number>(page);

  const effectivePageSize = controlledPageSize ?? internalPageSize;
  const effectivePage = page ?? internalPage;

  React.useEffect(() => {
    if (controlledPageSize !== undefined) {
      setInternalPageSize(controlledPageSize);
    }
  }, [controlledPageSize]);

  React.useEffect(() => {
    if (page !== undefined) {
      setInternalPage(page);
    }
  }, [page]);

  const handlePageSizeChange = (newSize: number) => {
    setInternalPageSize(newSize);
    setInternalPage(1);
    onPageSizeChange?.(newSize);
    onPageChange?.(1);
  };

  const handlePageChange = (newPage: number) => {
    setInternalPage(newPage);
    onPageChange?.(newPage);
  };

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = React.useState<Record<string, boolean>>(
    selectedRowIds ?? {}
  );
  const [globalFilter, setGlobalFilter] = React.useState("");

  React.useEffect(() => {
    if (selectedRowIds !== undefined) {
      setInternalRowSelection(selectedRowIds);
    }
  }, [selectedRowIds]);

  const rowSelection = selectedRowIds ?? internalRowSelection;

  const handleRowSelectionChange = (updaterOrValue: any) => {
    const newSelection =
      typeof updaterOrValue === "function"
        ? updaterOrValue(rowSelection)
        : updaterOrValue;
    setInternalRowSelection(newSelection);
    if (onRowSelectionChange) {
      let selectedItems: TData[] = [];
      if (getRowId) {
        selectedItems = (data || []).filter((item, idx) => {
          const id = getRowId(item, idx);
          return Boolean(newSelection[id]);
        });
      } else {
        const selectedIndices = Object.keys(newSelection).filter((k) => newSelection[k]);
        selectedItems = selectedIndices
          .map((idx) => paginatedData[Number(idx)] || data[Number(idx)])
          .filter(Boolean);
      }
      onRowSelectionChange(newSelection, selectedItems);
    }
  };

  const isServerSide = totalItems !== undefined && totalItems > data.length;
  const paginatedData = React.useMemo(() => {
    if (isServerSide || data.length <= effectivePageSize) {
      return data;
    }
    const startIndex = (effectivePage - 1) * effectivePageSize;
    return data.slice(startIndex, startIndex + effectivePageSize);
  }, [data, isServerSide, effectivePage, effectivePageSize]);

  const effectiveColumns = React.useMemo(() => {
    if (enableSelection === false || columns.some((col) => col.id === "select")) {
      return columns;
    }
    const selectColumn: ColumnDef<TData, unknown> = {
      id: "select",
      header: ({ table }) => <TableHeaderCheckbox table={table} />,
      cell: ({ row }) => <TableRowCheckbox row={row} />,
      enableSorting: false,
      enableHiding: false,
    };
    return [selectColumn, ...columns];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data: paginatedData,
    columns: effectiveColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onGlobalFilterChange: setGlobalFilter,
    enableRowSelection: enableSelection !== false,
    getRowId: getRowId,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  const computedTotalItems = totalItems !== undefined ? totalItems : data.length;
  const computedTotalPages =
    totalPages !== undefined && totalPages > 0
      ? totalPages
      : Math.max(1, Math.ceil(computedTotalItems / effectivePageSize));

  const startEntry =
    computedTotalItems > 0 ? (effectivePage - 1) * effectivePageSize + 1 : 0;

  const endEntry =
    computedTotalItems > 0
      ? Math.min(effectivePage * effectivePageSize, computedTotalItems)
      : 0;

  return (
    <div
      className={cn(
        "w-full flex-1 min-h-[300px] flex flex-col justify-between rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-xs relative",
        className
      )}
    >
      {searchKey && (
        <div className="flex items-center gap-2 p-3 pb-0 flex-shrink-0">
          <SearchInput
            placeholder={searchPlaceholder}
            defaultValue={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onSearch={(value) => table.getColumn(searchKey)?.setFilterValue(value)}
            className="w-full max-w-sm"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 flex flex-col relative">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-auto scrollbar-thin">
          <table className="w-full min-w-[720px] table-auto caption-bottom text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-30 shadow-xs bg-[var(--color-secondary-600)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="transition-colors">
                  {headerGroup.headers.map((header) => {
                    const isActions =
                      header.column.id.toLowerCase() === "actions" ||
                      header.id.toLowerCase() === "actions";
                    const isSelect =
                      header.column.id.toLowerCase() === "select" ||
                      header.id.toLowerCase() === "select";
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "h-12 sm:h-14 px-4 text-left align-middle text-xs font-bold tracking-wider whitespace-nowrap text-white uppercase sm:px-5 bg-[var(--color-secondary-600)] border-b border-[var(--color-secondary-700)] sticky top-0 z-30",
                          isSelect &&
                            "w-12 px-3 sm:px-4 text-center sticky top-0 left-0 z-40 bg-[var(--color-secondary-600)] border-r border-[var(--color-secondary-700)] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]",
                          isActions &&
                            "text-center sticky top-0 right-0 z-40 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.15)] border-l border-[var(--color-secondary-700)] bg-[var(--color-secondary-600)] text-white",
                          header.column.getCanSort() &&
                            "cursor-pointer select-none hover:text-white/80"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-1 text-white",
                            isActions || isSelect ? "justify-center" : ""
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {header.column.getCanSort() && (
                            <span className="text-white/80">
                              {header.column.getIsSorted() === "asc" ? (
                                <ChevronUp className="h-4 w-4 text-white" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ChevronDown className="h-4 w-4 text-white" />
                              ) : (
                                <ChevronsUpDown className="h-4 w-4 text-white/70" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      "group transition-colors hover:bg-[var(--color-neutral-50)]",
                      row.getIsSelected() && "bg-secondary-50/40 hover:bg-secondary-50/60"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isActions =
                        cell.column.id.toLowerCase() === "actions" ||
                        cell.id.toLowerCase().includes("actions");
                      const isSelect =
                        cell.column.id.toLowerCase() === "select" ||
                        cell.id.toLowerCase() === "select";
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-4 py-3.5 align-middle whitespace-nowrap sm:px-5 bg-white group-hover:bg-[var(--color-neutral-50)] transition-colors border-b border-gray-200",
                            row.getIsSelected() &&
                              "bg-secondary-50/40 group-hover:bg-secondary-50/60",
                            isSelect &&
                              "w-12 px-3 sm:px-4 text-center [&>div]:justify-center [&>div]:items-center sticky left-0 z-20 bg-white group-hover:bg-[var(--color-neutral-50)] border-r border-neutral-200/80 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.04)]",
                            isSelect &&
                              row.getIsSelected() &&
                              "bg-secondary-50/80 group-hover:bg-secondary-50/90",
                            isActions &&
                              "text-center [&>div]:justify-center [&>div]:items-center sticky right-0 z-20 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] border-l border-neutral-200/80 bg-white group-hover:bg-[var(--color-neutral-50)]",
                            isActions &&
                              row.getIsSelected() &&
                              "bg-secondary-50/80 group-hover:bg-secondary-50/90"
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={effectiveColumns.length}
                    className="h-28 text-center text-gray-500 bg-white border-b border-gray-200 text-sm"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 flex-shrink-0 border-t border-neutral-200/80 bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-[var(--color-neutral-600)]">
          <p className="font-medium">
            Showing {startEntry}–{endEntry} of {computedTotalItems} entries
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-neutral-600)] whitespace-nowrap">
              Rows per page:
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={effectivePageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-8 appearance-none rounded-lg border border-neutral-300 bg-white pl-2.5 pr-7 text-xs font-semibold text-neutral-700 shadow-2xs hover:border-neutral-400 hover:bg-neutral-50 focus:border-[#7A2224] focus:outline-none focus:ring-1 focus:ring-[#7A2224]/20 cursor-pointer transition-all"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-neutral-400" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => handlePageChange(effectivePage - 1)}
            disabled={effectivePage <= 1}
            className={cn(
              "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[var(--color-neutral-300)]",
              "bg-white text-[var(--color-neutral-700)] transition-colors hover:bg-[var(--color-neutral-50)] cursor-pointer",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs sm:text-sm font-semibold text-[var(--color-neutral-700)] px-1.5 min-w-[3.5rem] text-center">
            {effectivePage} / {computedTotalPages}
          </span>
          <button
            onClick={() => handlePageChange(effectivePage + 1)}
            disabled={effectivePage >= computedTotalPages}
            className={cn(
              "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[var(--color-neutral-300)]",
              "bg-white text-[var(--color-neutral-700)] transition-colors hover:bg-[var(--color-neutral-50)] cursor-pointer",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export { DataTable };
export type { DataTableProps };

