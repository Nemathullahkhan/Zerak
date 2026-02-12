import Image from "next/image";
import Link from "next/link";

interface NavLink {
  key: string;
  label: string;
}

interface NavbarProps {
  navLinks: NavLink[];
  onNavClick: (key: string) => void;
}

export function Navbar({ navLinks, onNavClick }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md animate-clip-reveal">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <Image
            src="/logos/ZerakLogo2.svg"
            alt="Zerak"
            width={40}
            height={40}
            className="h-20 w-20 mt-4"
            priority
          />
          <span className="-ml-5 font-heading font-semibold text-white tracking-tight text-lg">
            Zerak
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-xs font-medium">
          {navLinks.map((l) => (
            <a
              key={l.key}
              href={`#${l.key}`}
              className="hover:text-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                onNavClick(l.key);
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-neutral-950 hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
          >
            Start free
          </Link>
        </div>
      </div>
    </nav>
  );
}

