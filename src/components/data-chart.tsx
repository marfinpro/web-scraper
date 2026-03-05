"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ScrapeResult } from "@/lib/types";

interface DataChartProps {
  rows: ScrapeResult[];
}

const SOURCE_COLORS = ["#111111", "#4b5563", "#9ca3af"] as const;

export const DataChart = ({ rows }: DataChartProps) => {
  const sourceData = useMemo(() => {
    const sourceCounts = new Map<ScrapeResult["source"], number>([
      ["hadits", 0],
      ["news", 0],
      ["jobs", 0],
    ]);

    for (const row of rows) {
      sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1);
    }

    return [
      { name: "Hadith", value: sourceCounts.get("hadits") ?? 0 },
      { name: "News", value: sourceCounts.get("news") ?? 0 },
      { name: "Jobs", value: sourceCounts.get("jobs") ?? 0 },
    ];
  }, [rows]);

  const tagData = useMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const row of rows) {
      for (const tag of row.tags) {
        const normalizedTag = tag.trim().toLowerCase();
        if (normalizedTag.length === 0) {
          continue;
        }

        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) ?? 0) + 1);
      }
    }

    return [...tagCounts.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 8);
  }, [rows]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-black text-lg">Data by Source</h3>
        <div className="mt-3 h-72">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={sourceData}
                dataKey="value"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
              >
                {sourceData.map((entry, index) => (
                  <Cell
                    fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                    key={entry.name}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-black text-lg">Top Tags</h3>
        <div className="mt-3 h-72">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={tagData}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
              <XAxis dataKey="name" stroke="#111111" tick={{ fontSize: 12 }} />
              <YAxis stroke="#111111" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#111111" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
};
