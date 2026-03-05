"use client";

import type { ScrapeSource } from "@/lib/types";

interface SearchFilterProps {
  onSearchChange: (value: string) => void;
  onSourceChange: (value: "all" | ScrapeSource) => void;
  searchValue: string;
  sourceValue: "all" | ScrapeSource;
  total: number;
}

export const SearchFilter = ({
  onSearchChange,
  onSourceChange,
  searchValue,
  sourceValue,
  total,
}: SearchFilterProps) => {
  return (
    <section
      aria-label="Search and filter"
      className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
        <label className="flex flex-col gap-2">
          <span className="font-medium text-black text-sm">Search rows</span>
          <input
            className="rounded-xl border border-black/15 bg-white px-3 py-2 text-black text-sm outline-none transition placeholder:text-black/40 focus:border-black focus:ring-2 focus:ring-black/10"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search content, author, company, tags"
            type="search"
            value={searchValue}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-black text-sm">Source</span>
          <select
            className="rounded-xl border border-black/15 bg-white px-3 py-2 text-black text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            onChange={(event) =>
              onSourceChange(event.target.value as "all" | ScrapeSource)
            }
            value={sourceValue}
          >
            <option value="all">All Sources</option>
            <option value="hadits">Hadith</option>
            <option value="news">News</option>
            <option value="jobs">Jobs</option>
          </select>
        </label>

        <div className="flex items-end">
          <p className="w-full rounded-xl bg-zinc-100 px-4 py-2.5 text-center font-medium text-black text-sm">
            {total} rows
          </p>
        </div>
      </div>
    </section>
  );
};
