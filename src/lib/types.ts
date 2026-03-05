export const SCRAPE_SOURCES = ["hadits", "news", "jobs"] as const;

export type ScrapeSource = (typeof SCRAPE_SOURCES)[number];

export interface ScrapeResult {
  author?: string;
  company?: string;
  content: string;
  id: string;
  location?: string;
  scrapedAt: string;
  source: ScrapeSource;
  tags: string[];
  url?: string;
}

export interface ScrapeResponse {
  data: ScrapeResult[];
  error?: string;
  scrapedAt: string;
  source: ScrapeSource;
  success: boolean;
  total: number;
}

export interface ScrapeHistoryEntry {
  durationMs: number;
  id: string;
  scrapedAt: string;
  source: ScrapeSource;
  totalResults: number;
}

export interface ExportPayload {
  format: "csv" | "json";
  rows: ScrapeResult[];
}
