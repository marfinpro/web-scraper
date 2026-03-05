import { NextResponse } from "next/server";

import type { ExportPayload, ScrapeResult } from "@/lib/types";
import { rowsToCsv } from "@/lib/utils";

export const dynamic = "force-dynamic";

const isScrapeResult = (value: unknown): value is ScrapeResult => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<ScrapeResult>;
  return (
    typeof record.id === "string" &&
    typeof record.content === "string" &&
    typeof record.source === "string" &&
    Array.isArray(record.tags) &&
    typeof record.scrapedAt === "string"
  );
};

const buildFileName = (format: "csv" | "json"): string => {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  return `scrape-results-${stamp}.${format}`;
};

export const POST = async (request: Request) => {
  let payload: ExportPayload;

  try {
    payload = (await request.json()) as ExportPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (payload.format !== "csv" && payload.format !== "json") {
    return NextResponse.json(
      { success: false, error: "format must be csv or json" },
      { status: 400 }
    );
  }

  if (!(Array.isArray(payload.rows) && payload.rows.every(isScrapeResult))) {
    return NextResponse.json(
      { success: false, error: "rows must be an array of scrape results" },
      { status: 400 }
    );
  }

  if (payload.format === "json") {
    return new Response(JSON.stringify(payload.rows, null, 2), {
      headers: {
        "Content-Disposition": `attachment; filename="${buildFileName("json")}"`,
        "Content-Type": "application/json; charset=utf-8",
      },
      status: 200,
    });
  }

  return new Response(rowsToCsv(payload.rows), {
    headers: {
      "Content-Disposition": `attachment; filename="${buildFileName("csv")}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
    status: 200,
  });
};
