"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { FullClient } from "@/types/models";
import { format, parseISO, isBefore, addDays, isValid } from "date-fns";
import { useMemo, useState } from "react";

const formatDate = (value: string | null) => {
  if (!value) return "";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "MMM d, yyyy") : value;
};

const statusBadge = (record: FullClient) => {
  if (!record.nextDueDate) return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">No due</span>;
  const date = parseISO(record.nextDueDate);
  if (!isValid(date)) return null;
  const now = new Date();
  if (record.issues.some((i) => !i.resolved)) {
    return <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">Has issue</span>;
  }
  if (isBefore(date, now)) return <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">Overdue</span>;
  if (isBefore(date, addDays(now, 3))) return (
    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Due soon</span>
  );
  return <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">On track</span>;
};

interface ClientsTableProps {
  data: FullClient[];
  onDelete?: (id: string) => void;
  onEdit?: (client: FullClient) => void;
}

const ISSUE_FLAG_COLORS: Record<FullClient["issueFlag"], string> = {
  None: "bg-slate-200 text-slate-700",
  IDIQ: "bg-rose-100 text-rose-700",
  ID: "bg-orange-100 text-orange-700",
  "FTC Code": "bg-amber-100 text-amber-800",
  Payment: "bg-cyan-100 text-cyan-800",
  "DO NOT PROCESS": "bg-red-600 text-white",
  "Completed :)": "bg-purple-600 text-white",
  Paused: "bg-amber-200 text-amber-900",
  "Proof of Address": "bg-emerald-100 text-emerald-800",
  SSC: "bg-blue-200 text-blue-800",
};

export function ClientsTable({ data, onDelete, onEdit }: ClientsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "nextDueDate", desc: false }]);

  const columns = useMemo<ColumnDef<FullClient>[]>(
    () => [
      {
        header: "Client",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="font-semibold text-slate-900">
            {row.original.name || "(Unnamed)"} <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{row.original.status}</span>
            <p className="text-xs text-slate-500">{row.original.disputer || "Unassigned"}</p>
          </div>
        ),
      },
      {
        header: "Round",
        accessorKey: "round",
        size: 60,
        cell: ({ getValue }) => {
          const value = getValue<number | null>();
          return <span className="text-sm text-slate-700">{value ?? "-"}</span>;
        },
      },
      {
        header: "Processed?",
        accessorFn: (row) => Boolean(row.dateProcessed),
        cell: ({ getValue }) => (
          <span className="text-xs font-semibold text-slate-700">
            {getValue() ? "Yes" : "No"}
          </span>
        ),
      },
      {
        header: "Date Processed",
        accessorKey: "dateProcessed",
        cell: ({ getValue }) => <span className="text-sm text-slate-700">{formatDate(getValue() as string | null)}</span>,
      },
      {
        header: "Next Due",
        accessorKey: "nextDueDate",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="text-sm text-slate-800">{formatDate(row.original.nextDueDate)}</span>
            {statusBadge(row.original)}
          </div>
        ),
      },
      {
        header: "Issues",
        accessorKey: "issues",
        cell: ({ row }) => {
          const open = row.original.issues.filter((i) => !i.resolved).length;
          return (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                open ? "bg-orange-100 text-orange-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {open ? `${open} open` : "Clear"}
            </span>
          );
        },
      },
      {
        header: "Docs Pending",
        accessorKey: "docs",
        cell: ({ row }) => {
          const pending = row.original.docs.filter((d) => d.status === "pending" || d.status === "sent").length;
          return <span className="text-sm text-slate-700">{pending}</span>;
        },
      },
      {
        header: "Notes",
        accessorKey: "notes",
        cell: ({ getValue }) => (
          <span className="line-clamp-2 text-sm text-slate-600">{(getValue() as string) || "—"}</span>
        ),
      },
      {
        header: "ISSUES?",
        accessorKey: "issueFlag",
        cell: ({ row }) => (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${ISSUE_FLAG_COLORS[row.original.issueFlag]}`}>
            {row.original.issueFlag}
          </span>
        ),
      },
      {
        header: "Actions",
        accessorKey: "id",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {onEdit && (
              <button
                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => onEdit(row.original)}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600"
                onClick={() => onDelete(row.original.id)}
              >
                Delete
              </button>
            )}
          </div>
        ),
      },
    ],
    [onDelete, onEdit],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: "↑",
                        desc: "↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-top text-sm text-slate-800">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={columns.length}>
                  No matching records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 p-4 md:hidden">
        {data.map((row) => (
          <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-500">{row.disputer || "Unassigned"}</p>
              </div>
              {statusBadge(row)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
              <div>
                <p className="text-xs text-slate-500">Round</p>
                <p className="font-semibold">{row.round ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Next Due</p>
                <p className="font-semibold">{formatDate(row.nextDueDate)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Notes</p>
                <p className="line-clamp-2">{row.notes || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Issues</p>
                <p>{row.issues.filter((i) => !i.resolved).length || "None"}</p>
              </div>
              {(onDelete || onEdit) && (
                <div className="col-span-2 flex gap-2">
                  {onEdit && (
                    <button
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => onEdit(row)}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => onDelete(row.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-center text-sm text-slate-500">No records.</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[5, 8, 10, 20].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
