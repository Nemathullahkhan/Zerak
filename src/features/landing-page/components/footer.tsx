import Image from "next/image";
import Link from "next/link";
import { Github, Twitter } from "lucide-react";

interface NavLink {
  key: string;
  label: string;
}

interface FooterProps {
  navLinks: NavLink[];
  onNavClick: (key: string) => void;
}

export function Footer({ navLinks, onNavClick }: FooterProps) {
  return (
    <footer className="border-t border-neutral-800 py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Image
            src="/logos/ZerakLogo2.svg"
            alt="Zerak"
            width={22}
            height={22}
            className="h-[22px] w-[22px]"
          />
          <span className="font-heading font-semibold text-neutral-500">Zerak</span>
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-600">
          {navLinks.map((l) => (
            <a
              key={`footer-${l.key}`}
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
          <a href="#" className="hover:text-white transition-colors">
            Docs
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Blog
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Changelog
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Careers
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Status
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Contact
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Terms
          </a>
        </div>
        <div className="text-xs text-neutral-600">
          © {new Date().getFullYear()} Zerak. All rights reserved.
        </div>
        <div className="flex gap-4">
          <a
            href="#"
            aria-label="Twitter"
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <Twitter className="h-4 w-4" />
          </a>
          <a
            href="#"
            aria-label="GitHub"
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}



