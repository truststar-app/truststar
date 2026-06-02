"use client";

import Image from "next/image";
import Link from "next/link";

const GH = "https://github.com/truststar-app/truststar";

const LINKS = [
  { href: "/how-it-works", label: "How it Works" },
  { href: "/discover",     label: "Discover" },
  { href: "/recent",       label: "Recent" },
  { href: "/api-docs",     label: "API" },
  { href: "/badge",        label: "Badge" },
  { href: "/privacy",      label: "Privacy" },
  { href: "/terms",        label: "Terms" },
  { href: GH,              label: "GitHub", external: true },
];

export default function Footer() {
  return (
    <footer className="footer-bar">
      <div className="footer-inner">
        <Link href="/" className="footer-brand">
          <Image src="/30px-logo.webp" alt="TrustStar" width={14} height={14} />
          <span>TrustStar</span>
        </Link>

        <nav className="footer-links" aria-label="Footer navigation">
          {LINKS.map(({ href, label, external }) =>
            external ? (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="footer-link">
                {label}
              </a>
            ) : (
              <Link key={href} href={href} className="footer-link">
                {label}
              </Link>
            )
          )}
        </nav>

        <span className="footer-copy">© 2026 TrustStar</span>
      </div>
    </footer>
  );
}
