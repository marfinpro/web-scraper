import { load } from "cheerio";

import type { ScrapeResult } from "@/lib/types";

const MAX_ITEMS_PER_FEED = 20;

const NEWS_FEEDS = [
  {
    name: "Detik News",
    tag: "detik-news",
    url: "https://news.detik.com/berita/rss",
  },
  {
    name: "Detik Finance",
    tag: "detik-finance",
    url: "https://finance.detik.com/rss",
  },
  {
    name: "Tempo National",
    tag: "tempo-national",
    url: "http://rss.tempo.co/nasional",
  },
  {
    name: "Tempo Business",
    tag: "tempo-business",
    url: "http://rss.tempo.co/bisnis",
  },
  {
    name: "CNN Indonesia National",
    tag: "cnn-national",
    url: "https://www.cnnindonesia.com/nasional/rss",
  },
  {
    name: "CNN Indonesia Economy",
    tag: "cnn-economy",
    url: "https://www.cnnindonesia.com/ekonomi/rss",
  },
  {
    name: "ANTARA Latest",
    tag: "antara-latest",
    url: "https://www.antaranews.com/rss/terkini.xml",
  },
] as const;

const cleanText = (value: string): string => {
  return value.replaceAll(/\s+/g, " ").trim();
};

const toDateIso = (value: string, fallbackIso: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackIso;
  }

  return parsed.toISOString();
};

const uniqueTags = (values: string[]): string[] => {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = cleanText(value).toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(normalized);
  }

  return tags;
};

const scrapeOneFeed = async (
  feed: (typeof NEWS_FEEDS)[number]
): Promise<ScrapeResult[]> => {
  const response = await fetch(feed.url, {
    cache: "no-store",
    headers: {
      "User-Agent": "web-scraper-results-viewer/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${feed.name}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const $ = load(xml, { xmlMode: true });
  const now = new Date().toISOString();
  const results: ScrapeResult[] = [];

  $("item")
    .slice(0, MAX_ITEMS_PER_FEED)
    .each((_, itemElement) => {
      const title = cleanText($(itemElement).find("title").first().text());
      const link = cleanText($(itemElement).find("link").first().text());
      const description = cleanText(
        $(itemElement).find("description").first().text()
      );
      const publishedAtRaw = cleanText(
        $(itemElement).find("pubDate").first().text()
      );
      const categories = $(itemElement)
        .find("category")
        .map((__, categoryElement) => cleanText($(categoryElement).text()))
        .get();

      if (title.length === 0) {
        return;
      }

      const payloadText =
        description.length > 0 && description !== title
          ? `${title} — ${description}`
          : title;

      results.push({
        id: crypto.randomUUID(),
        content: payloadText,
        source: "news",
        tags: uniqueTags([feed.tag, ...categories]),
        url: link.length > 0 ? link : feed.url,
        scrapedAt: toDateIso(publishedAtRaw, now),
      });
    });

  return results;
};

export const scrapeNews = async (): Promise<ScrapeResult[]> => {
  const allResults: ScrapeResult[] = [];
  const errors: string[] = [];

  for (const feed of NEWS_FEEDS) {
    try {
      const rows = await scrapeOneFeed(feed);
      allResults.push(...rows);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "unknown feed error";
      errors.push(message);
    }
  }

  if (allResults.length === 0) {
    const details = errors.join(" | ");
    throw new Error(`Failed to scrape all news feeds (${details})`);
  }

  return allResults;
};
