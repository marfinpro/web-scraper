"use client";

import { useMemo, useState } from "react";

import { DataChart } from "@/components/data-chart";
import { ExportButton } from "@/components/export-button";
import { ResultsTable } from "@/components/results-table";
import { ScraperCard } from "@/components/scraper-card";
import { SearchFilter } from "@/components/search-filter";
import { WordCloud } from "@/components/word-cloud";
import type { ScrapeResult, ScrapeSource } from "@/lib/types";

const SCRAPER_CARDS = [
  {
    description: "Fetch hadith with Indonesian translations.",
    endpoint: "/api/scrape/hadits",
    icon: "📖",
    source: "hadits",
    title: "Hadith",
  },
  {
    description: "Scrape fresh headlines from RSS feed.",
    endpoint: "/api/scrape/news",
    icon: "📰",
    source: "news",
    title: "News",
  },
  {
    description: "Fetch public remote jobs and tag them.",
    endpoint: "/api/scrape/jobs",
    icon: "💼",
    source: "jobs",
    title: "Jobs",
  },
] satisfies Array<{
  description: string;
  endpoint: string;
  icon: string;
  source: ScrapeSource;
  title: string;
}>;

const SOURCE_LABELS: Record<ScrapeSource, string> = {
  hadits: "Hadith",
  jobs: "Jobs",
  news: "News",
};

const mergeRowsBySource = (
  currentRows: ScrapeResult[],
  source: ScrapeSource,
  incomingRows: ScrapeResult[]
): ScrapeResult[] => {
  const rowsWithoutSource = currentRows.filter((row) => row.source !== source);
  return [...rowsWithoutSource, ...incomingRows];
};

const includesQuery = (row: ScrapeResult, normalizedQuery: string): boolean => {
  if (normalizedQuery.length === 0) {
    return true;
  }

  const haystacks = [
    row.content,
    row.author ?? "",
    row.company ?? "",
    row.location ?? "",
    row.tags.join(" "),
    row.url ?? "",
  ];

  return haystacks.some((value) =>
    value.toLowerCase().includes(normalizedQuery)
  );
};

export const DashboardClient = () => {
  const [rows, setRows] = useState<ScrapeResult[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [sourceValue, setSourceValue] = useState<"all" | ScrapeSource>("all");

  const summaryBySource = useMemo(() => {
    return rows.reduce(
      (summary, row) => {
        summary[row.source] += 1;
        return summary;
      },
      { hadits: 0, jobs: 0, news: 0 } as Record<ScrapeSource, number>
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    return rows
      .filter((row) => {
        const sourceMatch = sourceValue === "all" || row.source === sourceValue;
        if (!sourceMatch) {
          return false;
        }

        return includesQuery(row, normalizedQuery);
      })
      .sort((left, right) => {
        return (
          new Date(right.scrapedAt).getTime() -
          new Date(left.scrapedAt).getTime()
        );
      });
  }, [rows, searchValue, sourceValue]);

  const handleSourceResults = (
    source: ScrapeSource,
    nextRows: ScrapeResult[]
  ) => {
    setRows((currentRows) => mergeRowsBySource(currentRows, source, nextRows));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="font-semibold text-2xl text-black">
          Scraper Results Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-black/70 text-sm">
          Run each scraper source, then explore the results with search,
          sorting, pagination, visualizations, and export.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(["hadits", "news", "jobs"] as const).map((source) => (
            <div
              className="rounded-xl border border-black/10 bg-zinc-50 p-3"
              key={source}
            >
              <p className="text-black/60 text-xs">
                Rows from {SOURCE_LABELS[source]}
              </p>
              <p className="font-semibold text-2xl text-black">
                {summaryBySource[source]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {SCRAPER_CARDS.map((card) => (
          <ScraperCard
            description={card.description}
            endpoint={card.endpoint}
            icon={card.icon}
            key={card.source}
            onResults={handleSourceResults}
            source={card.source}
            title={card.title}
          />
        ))}
      </section>

      <SearchFilter
        onSearchChange={setSearchValue}
        onSourceChange={setSourceValue}
        searchValue={searchValue}
        sourceValue={sourceValue}
        total={filteredRows.length}
      />

      <ExportButton rows={filteredRows} />

      <ResultsTable rows={filteredRows} />

      <DataChart rows={filteredRows} />
      <WordCloud rows={filteredRows} />
    </div>
  );
};
