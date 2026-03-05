import Link from "next/link";

import { Navbar } from "@/components/navbar";

const FEATURES = [
  "Scrape engine via Next.js API routes",
  "Interactive table: search, sort, pagination",
  "Charts + keyword cloud for fast insights",
  "Export filtered rows to CSV or JSON",
  "History timeline with source comparison",
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <p className="font-medium text-black/60 text-sm uppercase tracking-[0.18em]">
            Automating Real-World Tasks
          </p>
          <h1 className="mt-3 max-w-3xl font-semibold text-4xl text-black leading-tight md:text-5xl">
            Web Scraper Results Viewer
          </h1>
          <p className="mt-4 max-w-3xl text-base text-black/70 md:text-lg">
            A dashboard to collect, compare, and export scraping results from
            multiple public sources.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="!text-white inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 font-medium text-sm transition hover:bg-zinc-800"
              href="/dashboard"
            >
              Open Dashboard
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-black/20 px-5 py-3 font-medium text-black text-sm transition hover:bg-zinc-100"
              href="/history"
            >
              View Scrape History
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-black text-xl">Main Features</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <li
                className="rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-black/80 text-sm"
                key={feature}
              >
                {feature}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
