import { Navbar } from "@/components/navbar";
import { ScrapeHistoryList } from "@/components/scrape-history-list";

const HistoryPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <section className="mb-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="font-semibold text-2xl text-black">Scrape History</h1>
          <p className="mt-2 text-black/70 text-sm">
            Track scraping history and compare result changes over time.
          </p>
        </section>
        <ScrapeHistoryList />
      </main>
    </>
  );
};

export default HistoryPage;
