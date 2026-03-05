"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import type { ScrapeResult } from "@/lib/types";
import { formatDateTime, truncateText } from "@/lib/utils";

interface ResultsTableProps {
  rows: ScrapeResult[];
}

const SOURCE_LABEL: Record<ScrapeResult["source"], string> = {
  hadits: "Hadith",
  jobs: "Jobs",
  news: "News",
};

const SOURCE_BADGE_CLASS: Record<ScrapeResult["source"], string> = {
  hadits: "bg-zinc-50 text-zinc-800",
  jobs: "bg-zinc-200 text-zinc-800",
  news: "bg-zinc-100 text-zinc-700",
};

const getSortIndicator = (sortState: false | "asc" | "desc"): string => {
  if (sortState === "asc") {
    return " ^";
  }

  if (sortState === "desc") {
    return " v";
  }

  return "";
};

export const ResultsTable = ({ rows }: ResultsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "scrapedAt", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<ColumnDef<ScrapeResult>[]>(
    () => [
      {
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          return pageIndex * pageSize + row.index + 1;
        },
        header: "#",
        id: "rowIndex",
        size: 70,
      },
      {
        accessorKey: "content",
        cell: ({ row }) => {
          const text = truncateText(row.original.content, 120);
          if (row.original.url) {
            return (
              <a
                className="text-black underline decoration-black/25 underline-offset-2 hover:decoration-black"
                href={row.original.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {text}
              </a>
            );
          }

          return <span>{text}</span>;
        },
        header: "Content",
        size: 500,
      },
      {
        accessorKey: "source",
        cell: ({ row }) => {
          const source = row.original.source;
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 font-medium text-xs ${SOURCE_BADGE_CLASS[source]}`}
            >
              {SOURCE_LABEL[source]}
            </span>
          );
        },
        header: "Source",
      },
      {
        accessorKey: "author",
        cell: ({ row }) => {
          const metaParts = [row.original.author, row.original.company].filter(
            (part): part is string =>
              typeof part === "string" && part.length > 0
          );
          const location = row.original.location;
          if (metaParts.length === 0 && !location) {
            return <span className="text-black/40">-</span>;
          }

          return (
            <div className="space-y-1">
              {metaParts.length > 0 ? (
                <p className="font-medium text-black text-sm">
                  {metaParts.join(" | ")}
                </p>
              ) : null}
              {location ? (
                <p className="text-black/60 text-xs">{location}</p>
              ) : null}
            </div>
          );
        },
        header: "Meta",
      },
      {
        accessorKey: "tags",
        cell: ({ row }) => {
          const visibleTags = row.original.tags.slice(0, 4);
          const hiddenCount = row.original.tags.length - visibleTags.length;
          if (visibleTags.length === 0) {
            return <span className="text-black/40">-</span>;
          }

          return (
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span
                  className="rounded-md bg-zinc-100 px-2 py-1 text-black/70 text-xs"
                  key={`${row.original.id}-${tag}`}
                >
                  {tag}
                </span>
              ))}
              {hiddenCount > 0 ? (
                <span className="rounded-md bg-zinc-200 px-2 py-1 text-black/70 text-xs">
                  +{hiddenCount}
                </span>
              ) : null}
            </div>
          );
        },
        header: "Tags",
      },
      {
        accessorKey: "scrapedAt",
        cell: ({ row }) => formatDateTime(row.original.scrapedAt),
        header: "Date",
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: { pagination, sorting },
  });

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-7 text-center shadow-sm">
        <h2 className="font-semibold text-black text-lg">No results yet</h2>
        <p className="mt-2 text-black/65 text-sm">
          Run one of the scrapers above, then your data will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-zinc-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  const indicator = getSortIndicator(isSorted);

                  return (
                    <th
                      className="px-4 py-3 font-semibold text-black text-sm"
                      key={header.id}
                      scope="col"
                    >
                      {header.column.getCanSort() ? (
                        <button
                          className="cursor-pointer text-left"
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {indicator}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr className="border-black/10 border-t" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    className="px-4 py-3 align-top text-black text-sm"
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-black/10 border-t px-4 py-3">
        <p className="text-black/70 text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-black/15 px-3 py-1.5 text-black/70 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-black/30"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            type="button"
          >
            Prev
          </button>
          <button
            className="rounded-lg border border-black/15 px-3 py-1.5 text-black/70 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-black/30"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};
