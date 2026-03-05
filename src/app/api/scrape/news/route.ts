import { NextResponse } from "next/server";

import { scrapeNews } from "@/lib/scrapers/news-scraper";
import { saveScrapeRun } from "@/lib/store";
import type { ScrapeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async () => {
  const startedAt = Date.now();

  try {
    const rows = await scrapeNews();
    await saveScrapeRun("news", rows, Date.now() - startedAt);

    const payload: ScrapeResponse = {
      success: true,
      source: "news",
      total: rows.length,
      data: rows,
      scrapedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to scrape news";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
};
