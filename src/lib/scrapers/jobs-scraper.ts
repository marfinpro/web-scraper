import { load } from "cheerio";

import type { ScrapeResult } from "@/lib/types";

const DICODING_URL = "https://www.dicoding.com/jobs/old/list";
const KITALULUS_URL = "https://www.kitalulus.com/lowongan";
const TECH_IN_ASIA_INDONESIA_URL = "https://www.techinasia.com/jobs/indonesia";
const KEMNAKER_PASKER_URL = "https://paskerid.kemnaker.go.id/";

const MAX_ITEMS_PER_PROVIDER = 30;

const BROWSER_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
} as const;

interface KitaLulusCompany {
  name?: string;
}

interface KitaLulusLocation {
  name?: string;
}

interface KitaLulusItem {
  city?: KitaLulusLocation;
  company?: KitaLulusCompany;
  createdAt?: number;
  educationLevelStr?: string;
  isClosed?: boolean;
  isPublished?: boolean;
  jobFunction?: string;
  locationSiteStr?: string;
  positionName?: string;
  slug?: string;
  typeStr?: string;
  updatedAt?: number;
}

interface KitaLulusRoot {
  props?: {
    pageProps?: {
      initialState?: {
        vacancyList?: {
          server?: {
            items?: KitaLulusItem[];
          };
        };
      };
    };
  };
}

const cleanText = (value: string): string => {
  return value.replaceAll(/\s+/g, " ").trim();
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const parseDateIso = (
  input: number | string | undefined,
  fallbackIso: string
): string => {
  if (input === undefined || input === null) {
    return fallbackIso;
  }

  const numericValue =
    typeof input === "number" ? input : Number.parseInt(input, 10);

  if (Number.isFinite(numericValue)) {
    const milliseconds = (() => {
      if (numericValue > 1_000_000_000_000_000) {
        return Math.floor(numericValue / 1_000_000);
      }

      if (numericValue > 1_000_000_000_000) {
        return Math.floor(numericValue / 1000);
      }

      if (numericValue > 1_000_000_000) {
        return numericValue * 1000;
      }

      return numericValue;
    })();

    const parsedFromNumber = new Date(milliseconds);
    if (!Number.isNaN(parsedFromNumber.getTime())) {
      return parsedFromNumber.toISOString();
    }
  }

  const parsed = new Date(String(input));
  return Number.isNaN(parsed.getTime()) ? fallbackIso : parsed.toISOString();
};

const toAbsoluteUrl = (baseUrl: string, value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return new URL(value, baseUrl).toString();
};

const uniqueTags = (values: Array<string | undefined>): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    const normalized = cleanText(value).toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

const uniqueRows = (rows: ScrapeResult[]): ScrapeResult[] => {
  const map = new Map<string, ScrapeResult>();

  for (const row of rows) {
    const key = `${row.content.toLowerCase()}|${(row.company ?? "").toLowerCase()}|${(row.url ?? "").toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }

  return [...map.values()];
};

const fetchHtml = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: BROWSER_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
};

const scrapeDicodingJobs = async (): Promise<ScrapeResult[]> => {
  const html = await fetchHtml(DICODING_URL);
  const $ = load(html);
  const now = new Date().toISOString();
  const rows: ScrapeResult[] = [];

  $("div.card.white-bg.shadow.mb-3")
    .slice(0, MAX_ITEMS_PER_PROVIDER)
    .each((_, cardElement) => {
      const card = $(cardElement);
      const title = cleanText(card.find("h5 a").first().text());
      const href = card.find("h5 a").first().attr("href") ?? "";
      const company = cleanText(
        card.find("span.tipe .text-muted").first().text()
      );
      const jobTypeTags = card
        .find(".badge")
        .map((__, badgeElement) => cleanText($(badgeElement).text()))
        .get();

      if (title.length === 0) {
        return;
      }

      rows.push({
        id: crypto.randomUUID(),
        content: title,
        source: "jobs",
        company: company.length > 0 ? company : "Dicoding",
        tags: uniqueTags(["dicoding", ...jobTypeTags]),
        url: href.length > 0 ? toAbsoluteUrl(DICODING_URL, href) : DICODING_URL,
        scrapedAt: now,
      });
    });

  if (rows.length === 0) {
    throw new Error("no job cards found");
  }

  return rows;
};

const parseKitaLulusItems = (html: string): KitaLulusItem[] => {
  const $ = load(html);
  const jsonText = $("#__NEXT_DATA__").html();
  if (!jsonText) {
    throw new Error("missing __NEXT_DATA__ payload");
  }

  let payload: KitaLulusRoot;
  try {
    payload = JSON.parse(jsonText) as KitaLulusRoot;
  } catch {
    throw new Error("failed to parse __NEXT_DATA__ payload");
  }

  const items =
    payload.props?.pageProps?.initialState?.vacancyList?.server?.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("empty vacancy list");
  }

  return items;
};

const mapKitaLulusItemToRow = (
  item: KitaLulusItem,
  fallbackIso: string
): ScrapeResult | null => {
  if (item.isPublished === false || item.isClosed === true) {
    return null;
  }

  const title = cleanText(String(item.positionName ?? ""));
  if (title.length === 0) {
    return null;
  }

  const city = cleanText(String(item.city?.name ?? ""));
  const locationSite = cleanText(String(item.locationSiteStr ?? ""));
  const location = locationSite.length > 0 ? locationSite : city;

  return {
    id: crypto.randomUUID(),
    content: title,
    source: "jobs",
    company: cleanText(String(item.company?.name ?? "")) || "KitaLulus",
    location: location.length > 0 ? location : undefined,
    tags: uniqueTags([
      "kitalulus",
      item.typeStr ? String(item.typeStr) : undefined,
      item.jobFunction ? String(item.jobFunction) : undefined,
      item.educationLevelStr ? String(item.educationLevelStr) : undefined,
    ]),
    url: item.slug
      ? `https://www.kitalulus.com/lowongan/detail/${item.slug}`
      : KITALULUS_URL,
    scrapedAt: parseDateIso(item.updatedAt ?? item.createdAt, fallbackIso),
  };
};

const scrapeKitaLulusJobs = async (): Promise<ScrapeResult[]> => {
  const html = await fetchHtml(KITALULUS_URL);
  const items = parseKitaLulusItems(html);
  const now = new Date().toISOString();
  const rows = items
    .slice(0, MAX_ITEMS_PER_PROVIDER)
    .map((item) => mapKitaLulusItemToRow(item, now))
    .filter((row): row is ScrapeResult => row !== null);

  if (rows.length === 0) {
    throw new Error("no published jobs found");
  }

  return rows;
};

const scrapeTechInAsiaJobs = async (): Promise<ScrapeResult[]> => {
  const html = await fetchHtml(TECH_IN_ASIA_INDONESIA_URL);
  const $ = load(html);
  const now = new Date().toISOString();
  const rows: ScrapeResult[] = [];

  const jsonLdJobs = $("script[type='application/ld+json']")
    .map((_, scriptElement) => {
      const scriptText = $(scriptElement).html();
      if (!scriptText) {
        return null;
      }

      try {
        const payload = JSON.parse(scriptText) as unknown;
        if (Array.isArray(payload)) {
          return payload.filter(
            (entry) =>
              isRecord(entry) &&
              (entry["@type"] === "JobPosting" || entry["@type"] === "ListItem")
          );
        }

        if (
          isRecord(payload) &&
          (payload["@type"] === "JobPosting" || payload["@type"] === "ItemList")
        ) {
          return [payload];
        }
      } catch {
        return null;
      }

      return null;
    })
    .get()
    .flat()
    .filter((value): value is Record<string, unknown> => isRecord(value));

  for (const entry of jsonLdJobs) {
    const title = cleanText(String(entry.title ?? ""));
    if (title.length === 0) {
      continue;
    }

    rows.push({
      id: crypto.randomUUID(),
      content: title,
      source: "jobs",
      company: cleanText(String(entry.hiringOrganization ?? "Tech in Asia")),
      tags: uniqueTags(["tech-in-asia-indonesia"]),
      url: cleanText(String(entry.url ?? TECH_IN_ASIA_INDONESIA_URL)),
      scrapedAt: parseDateIso(
        String(entry.datePosted ?? entry.datePublished ?? ""),
        now
      ),
    });
  }

  if (rows.length === 0) {
    throw new Error("dynamic page without static job entries");
  }

  return rows.slice(0, MAX_ITEMS_PER_PROVIDER);
};

const scrapeKemnakerJobs = async (): Promise<ScrapeResult[]> => {
  const html = await fetchHtml(KEMNAKER_PASKER_URL);
  const $ = load(html);
  const now = new Date().toISOString();
  const rows: ScrapeResult[] = [];

  $(".job-card")
    .slice(0, MAX_ITEMS_PER_PROVIDER)
    .each((_, cardElement) => {
      const card = $(cardElement);
      const anchor = card.closest("a");
      const title = cleanText(card.find("h6, h5, h4").first().text());
      const company = cleanText(card.find("p.text-muted").first().text());
      const location = cleanText(card.find("p.text-secondary").first().text());
      const salary = cleanText(card.find("div.text-primary").first().text());
      const href = anchor.attr("href") ?? KEMNAKER_PASKER_URL;

      if (title.length === 0) {
        return;
      }

      rows.push({
        id: crypto.randomUUID(),
        content: title,
        source: "jobs",
        company: company.length > 0 ? company : "Karirhub Kemnaker",
        location: location.length > 0 ? location : undefined,
        tags: uniqueTags(["kemnaker", "karirhub", salary]),
        url: toAbsoluteUrl(KEMNAKER_PASKER_URL, href),
        scrapedAt: now,
      });
    });

  if (rows.length === 0) {
    throw new Error("no kemnaker cards found");
  }

  return rows;
};

export const scrapeJobs = async (): Promise<ScrapeResult[]> => {
  const providers = [
    { name: "dicoding", scrape: scrapeDicodingJobs },
    { name: "kitalulus", scrape: scrapeKitaLulusJobs },
    { name: "tech-in-asia-indonesia", scrape: scrapeTechInAsiaJobs },
    { name: "kemnaker-karirhub", scrape: scrapeKemnakerJobs },
  ] as const;

  const allRows: ScrapeResult[] = [];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const rows = await provider.scrape();
      allRows.push(...rows);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "unknown scrape error";
      errors.push(`${provider.name}: ${message}`);
    }
  }

  const deduplicatedRows = uniqueRows(allRows);
  if (deduplicatedRows.length === 0) {
    const details = errors.join(" | ");
    throw new Error(`Failed to scrape all jobs providers (${details})`);
  }

  return deduplicatedRows;
};
