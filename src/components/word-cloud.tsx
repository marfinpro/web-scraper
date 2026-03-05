"use client";

import { useMemo } from "react";

import type { ScrapeResult } from "@/lib/types";

interface WordCloudProps {
  rows: ScrapeResult[];
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]/g;
const WHITESPACE_REGEX = /\s+/;

const normalizeWord = (value: string): string => {
  return value.toLowerCase().replaceAll(NON_ALPHANUMERIC_REGEX, "").trim();
};

export const WordCloud = ({ rows }: WordCloudProps) => {
  const words = useMemo(() => {
    const frequencies = new Map<string, number>();

    for (const row of rows) {
      const combined = `${row.content} ${row.tags.join(" ")}`;
      const tokens = combined.split(WHITESPACE_REGEX);

      for (const token of tokens) {
        const normalizedWord = normalizeWord(token);
        if (normalizedWord.length < 3 || STOP_WORDS.has(normalizedWord)) {
          continue;
        }

        frequencies.set(
          normalizedWord,
          (frequencies.get(normalizedWord) ?? 0) + 1
        );
      }
    }

    return [...frequencies.entries()]
      .map(([word, count]) => ({ count, word }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 45);
  }, [rows]);

  if (words.length === 0) {
    return null;
  }

  const min = words.at(-1)?.count ?? 1;
  const max = words[0]?.count ?? 1;
  const range = Math.max(1, max - min);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-black text-lg">Keyword Cloud</h3>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        {words.map(({ count, word }) => {
          const scale = (count - min) / range;
          const fontSizeRem = 0.95 + scale * 1.35;

          return (
            <span
              className="text-black"
              key={word}
              style={{
                fontSize: `${fontSizeRem}rem`,
                opacity: 0.6 + scale * 0.4,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </section>
  );
};
