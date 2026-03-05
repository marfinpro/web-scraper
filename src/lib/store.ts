import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  ScrapeHistoryEntry,
  ScrapeResult,
  ScrapeSource,
} from "@/lib/types";
import { SCRAPE_SOURCES } from "@/lib/types";

interface PersistedStore {
  buckets: Record<ScrapeSource, ScrapeResult[]>;
  history: ScrapeHistoryEntry[];
}

const MAX_HISTORY_ITEMS = 200;
const STORE_DIR = join(process.cwd(), ".runtime-data");
const STORE_FILE = join(STORE_DIR, "scrape-store.json");

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const createEmptyStore = (): PersistedStore => {
  return {
    buckets: {
      hadits: [],
      jobs: [],
      news: [],
    },
    history: [],
  };
};

const readStore = async (): Promise<PersistedStore> => {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return createEmptyStore();
    }

    const nextStore = createEmptyStore();
    const buckets = parsed.buckets;
    if (isRecord(buckets)) {
      for (const source of SCRAPE_SOURCES) {
        const rows = buckets[source];
        if (Array.isArray(rows)) {
          nextStore.buckets[source] = rows as ScrapeResult[];
        }
      }
    }

    const history = parsed.history;
    if (Array.isArray(history)) {
      nextStore.history = history
        .slice(0, MAX_HISTORY_ITEMS)
        .filter((entry): entry is ScrapeHistoryEntry => isRecord(entry));
    }

    return nextStore;
  } catch {
    return createEmptyStore();
  }
};

const writeStore = async (store: PersistedStore): Promise<void> => {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store), "utf8");
};

export const saveScrapeRun = async (
  source: ScrapeSource,
  rows: ScrapeResult[],
  durationMs: number
): Promise<void> => {
  const store = await readStore();
  store.buckets[source] = rows;
  store.history.unshift({
    id: crypto.randomUUID(),
    source,
    totalResults: rows.length,
    scrapedAt: new Date().toISOString(),
    durationMs,
  });

  if (store.history.length > MAX_HISTORY_ITEMS) {
    store.history.length = MAX_HISTORY_ITEMS;
  }

  await writeStore(store);
};

export const getResultsBySource = async (
  source: ScrapeSource
): Promise<ScrapeResult[]> => {
  const store = await readStore();
  return [...store.buckets[source]];
};

export const getAllResults = async (): Promise<ScrapeResult[]> => {
  const store = await readStore();
  return [
    ...store.buckets.hadits,
    ...store.buckets.news,
    ...store.buckets.jobs,
  ];
};

export const getHistory = async (): Promise<ScrapeHistoryEntry[]> => {
  const store = await readStore();
  return [...store.history];
};
