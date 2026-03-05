import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
] as const;

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-20 border-black/10 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link
          className="font-semibold text-black text-xl tracking-tight"
          href="/"
        >
          Web Scraper Results Viewer
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  className="rounded-full px-4 py-2 font-medium text-black/70 text-sm transition hover:bg-zinc-100 hover:text-black"
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};
