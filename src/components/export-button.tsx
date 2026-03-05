"use client";

import { useState } from "react";

import type { ScrapeResult } from "@/lib/types";

interface ExportButtonProps {
  rows: ScrapeResult[];
}

interface ExportResponseError {
  error?: string;
}

const FILE_NAME_REGEX = /filename="([^"]+)"/;

const extractFilename = (
  headerValue: string | null,
  fallback: string
): string => {
  if (!headerValue) {
    return fallback;
  }

  const matched = FILE_NAME_REGEX.exec(headerValue);
  return matched?.[1] ?? fallback;
};

export const ExportButton = ({ rows }: ExportButtonProps) => {
  const [error, setError] = useState<string | null>(null);
  const [loadingFormat, setLoadingFormat] = useState<"csv" | "json" | null>(
    null
  );

  const handleDownload = async (format: "csv" | "json") => {
    if (rows.length === 0) {
      setError("No rows available to export.");
      return;
    }

    setLoadingFormat(format);
    setError(null);

    try {
      const response = await fetch("/api/export", {
        body: JSON.stringify({ format, rows }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as ExportResponseError;
        throw new Error(payload.error ?? "Export failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fallback = `scrape-results.${format}`;
      const contentDisposition = response.headers.get("Content-Disposition");
      link.href = objectUrl;
      link.download = extractFilename(contentDisposition, fallback);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown export error"
      );
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="!text-white rounded-xl bg-black px-4 py-2 font-medium text-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-black/30"
          disabled={loadingFormat !== null}
          onClick={() => handleDownload("csv")}
          type="button"
        >
          {loadingFormat === "csv" ? "Exporting CSV..." : "Export CSV"}
        </button>
        <button
          className="rounded-xl border border-black/20 px-4 py-2 font-medium text-black text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-black/40"
          disabled={loadingFormat !== null}
          onClick={() => handleDownload("json")}
          type="button"
        >
          {loadingFormat === "json" ? "Exporting JSON..." : "Export JSON"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-600 text-xs">
          {error}
        </p>
      ) : null}
    </section>
  );
};
