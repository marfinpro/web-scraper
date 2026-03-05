import { type CheerioAPI, load } from "cheerio";

import type { ScrapeResult } from "@/lib/types";

const HADITS_TAZKIA_URL = "https://hadits.tazkia.ac.id/hadits/buku/1";
const HADITS_ARINA_URL = "https://hadits.arina.id/shahih_bukhari";
const HADITS_ID_COLLECTION_URLS = [
  "https://www.hadits.id/hadits/bukhari",
  "https://www.hadits.id/hadits/muslim",
  "https://www.hadits.id/hadits/tirmidzi",
] as const;

const MAX_ITEMS_PER_PAGE = 30;
const MAX_TAZKIA_PAGES = 6;
const MAX_ARINA_PAGES = 6;

const HADITS_NUMBER_REGEX = /#\s*(\d+)/;
const ARINA_ROW_NUMBER_REGEX = /ayat_(\d+)/;
const HADITS_ID_DETAIL_REGEX = /\/hadits\/([a-z-]+)\/(\d+)/;
const PAGE_ORDER_REGEX = /[?&](?:page_haditses|page)=(\d+)/;
const TAZKIA_PAGE_PARAM_REGEX = /page_haditses=/;
const ARINA_PAGE_PARAM_REGEX = /[?&]page=\d+/;

const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
} as const;

const cleanText = (value: string): string => {
  return value.replaceAll(/\s+/g, " ").trim();
};

const toAbsoluteUrl = (baseUrl: string, value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return new URL(value, baseUrl).toString();
};

const toCollectionTag = (value: string, fallback: string): string => {
  const normalized = cleanText(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .replaceAll(/\s+/g, "-");

  return normalized.length > 0 ? normalized : fallback;
};

const toTitleCase = (value: string): string => {
  return value
    .split("-")
    .map((part) => {
      if (part.length === 0) {
        return part;
      }

      return `${part[0]?.toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
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

const fetchHtml = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: REQUEST_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
};

const uniqueRows = (rows: ScrapeResult[]): ScrapeResult[] => {
  const result = new Map<string, ScrapeResult>();

  for (const row of rows) {
    const key = `${row.content.toLowerCase()}|${(row.url ?? "").toLowerCase()}`;
    if (!result.has(key)) {
      result.set(key, row);
    }
  }

  return [...result.values()];
};

const getPageOrder = (url: string): number => {
  const matched = PAGE_ORDER_REGEX.exec(url);
  if (!matched) {
    return 1;
  }

  const value = Number.parseInt(matched[1] ?? "", 10);
  return Number.isFinite(value) ? value : 1;
};

const getPaginationUrls = (
  $: CheerioAPI,
  baseUrl: string,
  pagePattern: RegExp,
  maxPages: number
): string[] => {
  const seen = new Set<string>([baseUrl]);
  const candidates: string[] = [];

  $("a[href]").each((_, anchorElement) => {
    const href = $(anchorElement).attr("href") ?? "";
    if (!pagePattern.test(href)) {
      return;
    }

    const absoluteUrl = toAbsoluteUrl(baseUrl, href);
    if (seen.has(absoluteUrl)) {
      return;
    }

    seen.add(absoluteUrl);
    candidates.push(absoluteUrl);
  });

  const sorted = candidates.sort((left, right) => {
    return getPageOrder(left) - getPageOrder(right);
  });

  return [baseUrl, ...sorted].slice(0, maxPages);
};

const parseTazkiaPage = (
  html: string,
  pageUrl: string,
  scrapedAt: string
): ScrapeResult[] => {
  const $ = load(html);
  const rows: ScrapeResult[] = [];

  $("div.hadits")
    .slice(0, MAX_ITEMS_PER_PAGE)
    .each((_, haditsElement) => {
      const node = $(haditsElement);
      const title = cleanText(node.find("h2").first().text());
      const arabic = cleanText(node.find("p.arabic").first().text());
      const translation = cleanText(node.find("p.indonesia").first().text());
      const detailHref =
        node.find("a[href*='/hadits/']").first().attr("href") ?? "";
      const number = title.match(HADITS_NUMBER_REGEX)?.[1];
      const author = title.split("#")[0]?.trim() || "Tazkia Hadith";
      const contentText = translation.length > 0 ? translation : arabic;

      if (contentText.length === 0) {
        return;
      }

      rows.push({
        id: crypto.randomUUID(),
        author,
        content: title.length > 0 ? `${title} - ${contentText}` : contentText,
        source: "hadits",
        tags: uniqueTags([
          "hadith",
          "tazkia",
          toCollectionTag(author, "bukhari"),
          number ? `no-${number}` : undefined,
        ]),
        url:
          detailHref.length > 0 ? toAbsoluteUrl(pageUrl, detailHref) : pageUrl,
        scrapedAt,
      });
    });

  return rows;
};

const scrapeTazkiaHadits = async (): Promise<ScrapeResult[]> => {
  const firstHtml = await fetchHtml(HADITS_TAZKIA_URL);
  const firstPage = load(firstHtml);
  const pages = getPaginationUrls(
    firstPage,
    HADITS_TAZKIA_URL,
    TAZKIA_PAGE_PARAM_REGEX,
    MAX_TAZKIA_PAGES
  );
  const scrapedAt = new Date().toISOString();
  const rows = parseTazkiaPage(firstHtml, HADITS_TAZKIA_URL, scrapedAt);

  for (const pageUrl of pages.slice(1)) {
    try {
      const html = await fetchHtml(pageUrl);
      rows.push(...parseTazkiaPage(html, pageUrl, scrapedAt));
    } catch {
      // Ignore partial page failures and keep successful rows.
    }
  }

  if (rows.length === 0) {
    throw new Error("no hadith blocks found");
  }

  return rows;
};

const parseArinaPage = (
  html: string,
  pageUrl: string,
  scrapedAt: string
): ScrapeResult[] => {
  const $ = load(html);
  const pageTitle = cleanText($("h1").first().text()) || "Shahih Bukhari";
  const rows: ScrapeResult[] = [];

  $("div[id^='ayat_']")
    .slice(0, MAX_ITEMS_PER_PAGE)
    .each((_, haditsElement) => {
      const node = $(haditsElement);
      const rowId = node.attr("id") ?? "";
      const number = rowId.match(ARINA_ROW_NUMBER_REGEX)?.[1];
      const arabic = cleanText(
        node.find("div.ayat p, p.arabic").first().text()
      );
      const translation = cleanText(
        node.find("div.terjamah, p.indonesia").first().text()
      );
      const contentText = translation.length > 0 ? translation : arabic;

      if (contentText.length === 0) {
        return;
      }

      rows.push({
        id: crypto.randomUUID(),
        author: pageTitle,
        content: `${pageTitle}${number ? ` #${number}` : ""} - ${contentText}`,
        source: "hadits",
        tags: uniqueTags([
          "hadith",
          "arina",
          toCollectionTag(pageTitle, "bukhari"),
          number ? `no-${number}` : undefined,
        ]),
        url: rowId.length > 0 ? `${pageUrl}#${rowId}` : pageUrl,
        scrapedAt,
      });
    });

  return rows;
};

const scrapeArinaHadits = async (): Promise<ScrapeResult[]> => {
  const firstHtml = await fetchHtml(HADITS_ARINA_URL);
  const firstPage = load(firstHtml);
  const pages = getPaginationUrls(
    firstPage,
    HADITS_ARINA_URL,
    ARINA_PAGE_PARAM_REGEX,
    MAX_ARINA_PAGES
  );
  const scrapedAt = new Date().toISOString();
  const rows = parseArinaPage(firstHtml, HADITS_ARINA_URL, scrapedAt);

  for (const pageUrl of pages.slice(1)) {
    try {
      const html = await fetchHtml(pageUrl);
      rows.push(...parseArinaPage(html, pageUrl, scrapedAt));
    } catch {
      // Ignore partial page failures and keep successful rows.
    }
  }

  if (rows.length === 0) {
    throw new Error("no ayat rows found");
  }

  return rows;
};

const parseHaditsIdPage = (
  html: string,
  collectionUrl: string,
  seenUrls: Set<string>,
  scrapedAt: string
): ScrapeResult[] => {
  const $ = load(html);
  const rows: ScrapeResult[] = [];

  $("a[href*='/hadits/']")
    .slice(0, MAX_ITEMS_PER_PAGE)
    .each((_, linkElement) => {
      const node = $(linkElement);
      const href = node.attr("href") ?? "";
      if (href.length === 0) {
        return;
      }

      const absoluteUrl = toAbsoluteUrl(collectionUrl, href);
      if (seenUrls.has(absoluteUrl)) {
        return;
      }

      const matched = HADITS_ID_DETAIL_REGEX.exec(absoluteUrl);
      if (!matched) {
        return;
      }

      seenUrls.add(absoluteUrl);
      const collection = matched[1] ?? "bukhari";
      const number = matched[2];
      const title = cleanText(node.text());
      const fallbackText = number
        ? `${toTitleCase(collection)} Hadith #${number}`
        : `${toTitleCase(collection)} Hadith`;
      const content = title.length > 0 ? title : fallbackText;

      rows.push({
        id: crypto.randomUUID(),
        author: "Hadits.id",
        content,
        source: "hadits",
        tags: uniqueTags([
          "hadith",
          "hadith-id",
          collection,
          number ? `no-${number}` : undefined,
        ]),
        url: absoluteUrl,
        scrapedAt,
      });
    });

  return rows;
};

const scrapeHaditsId = async (): Promise<ScrapeResult[]> => {
  const scrapedAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const rows: ScrapeResult[] = [];

  for (const collectionUrl of HADITS_ID_COLLECTION_URLS) {
    try {
      const html = await fetchHtml(collectionUrl);
      rows.push(...parseHaditsIdPage(html, collectionUrl, seenUrls, scrapedAt));
    } catch {
      // Ignore partial source failures and keep successful rows.
    }
  }

  if (rows.length === 0) {
    throw new Error("no hadith links found");
  }

  return rows;
};

export const scrapeHadits = async (): Promise<ScrapeResult[]> => {
  const providers = [
    { name: "hadith-tazkia", scrape: scrapeTazkiaHadits },
    { name: "arina-hadith", scrape: scrapeArinaHadits },
    { name: "hadith-id", scrape: scrapeHaditsId },
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
    throw new Error(`Failed to scrape all hadith sources (${details})`);
  }

  return deduplicatedRows;
};
