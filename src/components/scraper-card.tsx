"use client";

import { useState } from "react";

import type { ScrapeResult, ScrapeSource } from "@/lib/types";

interface ScraperCardProps {
  description: string;
  endpoint: string;
  icon: string;
  onResults: (source: ScrapeSource, rows: ScrapeResult[]) => void;
  source: ScrapeSource;
  title: string;
}

interface ScrapeRouteResponse {
  data?: ScrapeResult[];
  error?: string;
  success: boolean;
}

export const ScraperCard = ({
  description,
  endpoint,
  icon,
  onResults,
  source,
  title,
}: ScraperCardProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCount, setLastCount] = useState<number | null>(null);

  const handleScrape = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = (await response.json()) as ScrapeRouteResponse;

      if (!(response.ok && payload.success && Array.isArray(payload.data))) {
        throw new Error(payload.error ?? "Scrape request failed");
      }

      setLastCount(payload.data.length);
      onResults(source, payload.data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown scrape error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <article className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p aria-hidden className="text-3xl leading-none">
        {icon}
      </p>
      <h3 className="mt-3 font-semibold text-black text-lg">{title}</h3>
      <p className="mt-1 text-black/70 text-sm">{description}</p>
      <div className="mt-auto space-y-3 pt-10">
        {lastCount !== null ? (
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-black/70 text-xs">
            Last run: {lastCount} rows
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600 text-xs">
            {error}
          </p>
        ) : null}
        <button
          className="!text-white w-full rounded-xl bg-black px-4 py-2.5 font-medium text-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-black/30"
          disabled={isLoading}
          onClick={handleScrape}
          type="button"
        >
          {isLoading ? "Scraping..." : "Start Scrape"}
        </button>
      </div>
    </article>
  );
};
