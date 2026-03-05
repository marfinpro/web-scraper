import { DashboardClient } from "@/components/dashboard-client";
import { Navbar } from "@/components/navbar";

const DashboardPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <DashboardClient />
      </main>
    </>
  );
};

export default DashboardPage;
