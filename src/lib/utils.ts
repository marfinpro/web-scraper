import type { ScrapeResult } from "@/lib/types";

const CSV_COLUMNS = [
  "id",
  "content",
  "source",
  "author",
  "company",
  "location",
  "tags",
  "url",
  "scrapedAt",
] as const;

const escapeCsvValue = (value: string): string => {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
};

export const rowsToCsv = (rows: ScrapeResult[]): string => {
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) => {
    const values = CSV_COLUMNS.map((column) => {
      const rawValue = (() => {
        if (column === "tags") {
          return row.tags.join("|");
        }

        return row[column] ?? "";
      })();

      return escapeCsvValue(String(rawValue));
    });

    return values.join(",");
  });

  return [header, ...lines].join("\n");
};

export const formatDateTime = (dateIso: string): string => {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const truncateText = (text: string, length: number): string => {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length)}...`;
};
