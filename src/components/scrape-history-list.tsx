"use client";

import { useEffect, useMemo, useState } from "react";

import type { ScrapeHistoryEntry, ScrapeSource } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface HistoryResponse {
  data?: ScrapeHistoryEntry[];
  error?: string;
  success: boolean;
}

type HistoryWithDelta = ScrapeHistoryEntry & {
  deltaFromPrevious: number | null;
};

const SOURCE_LABELS: Record<ScrapeSource, string> = {
  hadits: "Hadith",
  jobs: "Jobs",
  news: "News",
};

const getDeltaText = (delta: number | null): string => {
  if (delta === null) {
    return "first run";
  }

  if (delta > 0) {
    return `+${delta}`;
  }

  return String(delta);
};

const getDeltaClassName = (delta: number | null): string => {
  if (delta === null) {
    return "text-black/50";
  }

  if (delta >= 0) {
    return "text-black";
  }

  return "text-black/70";
};

export const ScrapeHistoryList = () => {
  const [entries, setEntries] = useState<ScrapeHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/history", { cache: "no-store" });
        const payload = (await response.json()) as HistoryResponse;
        if (!(response.ok && payload.success && Array.isArray(payload.data))) {
          throw new Error(payload.error ?? "Failed to load scrape history");
        }

        setEntries(payload.data);
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unknown history error"
        );
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, []);

  const entriesWithDelta = useMemo(() => {
    const previousBySource = new Map<ScrapeSource, number>();
    const mapped: HistoryWithDelta[] = new Array(entries.length);

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const item = entries[index];
      const previous = previousBySource.get(item.source);
      mapped[index] = {
        ...item,
        deltaFromPrevious:
          previous === undefined ? null : item.totalResults - previous,
      };
      previousBySource.set(item.source, item.totalResults);
    }

    return mapped;
  }, [entries]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-black/70 text-sm">Loading history...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="font-semibold text-lg text-red-600">History Error</h2>
        <p className="mt-2 text-red-600 text-sm">{error}</p>
      </section>
    );
  }

  if (entriesWithDelta.length === 0) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-black text-lg">No history yet</h2>
        <p className="mt-2 text-black/70 text-sm">
          Run a scrape from the dashboard and the history timeline will appear
          here.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-black text-sm">
                Time
              </th>
              <th className="px-4 py-3 text-left font-semibold text-black text-sm">
                Source
              </th>
              <th className="px-4 py-3 text-left font-semibold text-black text-sm">
                Results
              </th>
              <th className="px-4 py-3 text-left font-semibold text-black text-sm">
                Delta
              </th>
              <th className="px-4 py-3 text-left font-semibold text-black text-sm">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {entriesWithDelta.map((entry) => {
              const delta = entry.deltaFromPrevious;
              const deltaClass = getDeltaClassName(delta);
              const deltaText = getDeltaText(delta);

              return (
                <tr className="border-black/10 border-t" key={entry.id}>
                  <td className="px-4 py-3 text-black text-sm">
                    {formatDateTime(entry.scrapedAt)}
                  </td>
                  <td className="px-4 py-3 text-black text-sm">
                    {SOURCE_LABELS[entry.source]}
                  </td>
                  <td className="px-4 py-3 text-black text-sm">
                    {entry.totalResults}
                  </td>
                  <td className={`px-4 py-3 text-sm ${deltaClass}`}>
                    {deltaText}
                  </td>
                  <td className="px-4 py-3 text-black text-sm">
                    {entry.durationMs} ms
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
