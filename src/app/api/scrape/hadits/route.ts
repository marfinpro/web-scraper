import { NextResponse } from "next/server";

import { scrapeHadits } from "@/lib/scrapers/hadits-scraper";
import { saveScrapeRun } from "@/lib/store";
import type { ScrapeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async () => {
  const startedAt = Date.now();

  try {
    const rows = await scrapeHadits();
    await saveScrapeRun("hadits", rows, Date.now() - startedAt);

    const payload: ScrapeResponse = {
      success: true,
      source: "hadits",
      total: rows.length,
      data: rows,
      scrapedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to scrape hadith";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
};
