"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const headerStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: "var(--header-h)",
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "saturate(180%) blur(14px)",
  WebkitBackdropFilter: "saturate(180%) blur(14px)",
  borderBottom: "1px solid var(--border)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 24px",
};

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: "transform 0.2s ease" }}>
      <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LogoContent() {
  return (
    <>
      <Image src="/30px-logo.webp" alt="TrustStar" width={28} height={28} style={{ flexShrink: 0 }} priority />
      <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.4px" }}>TrustStar</span>
    </>
  );
}

function DropdownItem({
  icon, title, desc, badge, href = "#", iconRed,
}: {
  icon: React.ReactNode; title: string; desc: string; badge?: string; href?: string; iconRed?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 10px", borderRadius: "var(--radius)", textDecoration: "none", color: "var(--text-primary)", transition: "background 0.1s" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <div style={{ width: 30, height: 30, borderRadius: "var(--radius)", background: iconRed ? "var(--accent-subtle)" : "var(--bg-base)", border: `1px solid ${iconRed ? "var(--accent-muted)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 1, color: iconRed ? "var(--accent)" : "inherit" }}>
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          {title}
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "var(--accent-subtle)", padding: "1px 6px", borderRadius: 10, marginLeft: 6, verticalAlign: "middle" }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.35 }}>{desc}</span>
      </div>
    </Link>
  );
}

function DropdownDivider() {
  return <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />;
}

export default function Header() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") { setMoreOpen(false); setMenuOpen(false); }
    }
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  function navLink(href: string, label: string, accent?: boolean): React.ReactNode {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        style={{
          padding: "6px 11px", fontSize: 13, fontWeight: isActive ? 600 : 500,
          color: accent ? "var(--accent)" : isActive ? "var(--text-primary)" : "var(--text-secondary)",
          textDecoration: "none", borderRadius: "var(--radius)", transition: "color 0.12s, background 0.12s",
          background: isActive ? "var(--bg-hover)" : "none",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = accent ? "var(--accent-subtle)" : "var(--bg-hover)";
          el.style.color = accent ? "var(--accent-hover)" : "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = isActive ? "var(--bg-hover)" : "none";
          el.style.color = accent ? "var(--accent)" : isActive ? "var(--text-primary)" : "var(--text-secondary)";
        }}
      >
        {label}
      </Link>
    );
  }

  const moreDropdownStyle: CSSProperties = {
    position: "absolute", top: "calc(100% + 6px)", right: 0,
    background: "var(--bg-dropdown)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", padding: "6px",
    minWidth: 220, zIndex: 200,
    opacity: moreOpen ? 1 : 0, visibility: moreOpen ? "visible" : "hidden",
    transform: moreOpen ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.98)",
    transition: "opacity 0.14s ease, transform 0.14s ease, visibility 0.14s",
  };

  // ─── Mobile nav link helper ──────────────────────────────────────────────────
  function mobileNavLink(href: string, label: string, external?: boolean) {
    const isActive = pathname === href;
    const style: CSSProperties = {
      display: "block", padding: "14px 24px", fontSize: 16, fontWeight: isActive ? 600 : 400,
      color: isActive ? "var(--accent)" : "var(--text-primary)", textDecoration: "none",
      borderBottom: "1px solid var(--border-subtle)",
    };
    if (external) {
      return (
        <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={style} onClick={() => setMenuOpen(false)}>
          {label}
        </a>
      );
    }
    return (
      <Link key={href} href={href} style={style} onClick={() => setMenuOpen(false)}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <header ref={headerRef} style={headerStyle}>
        {/* Left: logo + desktop nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text-primary)" }}>
            <LogoContent />
          </Link>
          <nav className="hidden lg:flex" style={{ alignItems: "center", gap: 1 }}>
            {navLink("/", "Analyze")}
            {navLink("/discover", "Discover", true)}
            {navLink("/recent", "Recent")}
            {navLink("/how-it-works", "How it Works")}
            {navLink("/api-docs", "API")}
          </nav>
        </div>

        {/* Right: desktop actions */}
        <div className="hidden lg:flex" style={{ alignItems: "center", gap: 3 }}>
          {/* More dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMoreOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "6px 11px",
                fontSize: 13, fontWeight: 500,
                color: moreOpen ? "var(--text-primary)" : "var(--text-secondary)",
                background: moreOpen ? "var(--bg-hover)" : "none",
                border: "none", borderRadius: "var(--radius)", cursor: "pointer",
                fontFamily: "inherit", transition: "color 0.12s, background 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = moreOpen ? "var(--bg-hover)" : "none";
                (e.currentTarget as HTMLElement).style.color = moreOpen ? "var(--text-primary)" : "var(--text-secondary)";
              }}
            >
              More
              <span style={{ opacity: 0.45, transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", display: "flex" }}>
                <ChevronIcon />
              </span>
            </button>

            <div style={moreDropdownStyle} onClick={(e) => e.stopPropagation()}>
              <DropdownItem href="/" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>} iconRed title="Trust Score" desc="GitHub fake star detection" />
              <DropdownItem href="/npm/express" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>} title="npm Check" desc="Downloads vs stars consistency" />
              <DropdownItem href="/skill/expressjs/express" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>} title="Code Scan" desc="Static security analysis" badge="NEW" />
              <DropdownDivider />
              <DropdownItem href="/badge" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>} title="Badge" desc="Embed your trust score" />
              <DropdownItem href="/recent" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/><circle cx="12" cy="12" r="2"/></svg>} title="Recent Audits" desc="Live community feed" />
              <DropdownDivider />
              <DropdownItem href="https://github.com/truststar-app/truststar" icon={<GitHubIcon />} title="GitHub" desc="Open source — contribute" />
            </div>
          </div>

          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

          <Link
            href="/coming-soon"
            style={{ padding: "6px 12px", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", background: "none", border: "none", borderRadius: "var(--radius)", cursor: "pointer", textDecoration: "none", transition: "color 0.12s, background 0.12s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            Log in
          </Link>

          <Link
            href="/coming-soon"
            style={{ padding: "6px 14px", fontSize: 13, fontWeight: 500, color: "#fff", background: "var(--accent)", border: "none", borderRadius: "var(--radius)", cursor: "pointer", textDecoration: "none", transition: "background 0.15s", boxShadow: "0 1px 3px rgba(217,54,54,0.2)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
          >
            Sign up
          </Link>
        </div>

        {/* Mobile hamburger button — hidden on desktop */}
        <button
          className="header-burger lg:hidden flex"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
      </header>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "var(--bg-surface)",
            display: "flex", flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: "var(--header-h)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text-primary)" }} onClick={() => setMenuOpen(false)}>
              <Image src="/30px-logo.webp" alt="TrustStar" width={24} height={24} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.4px" }}>TrustStar</span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 6, background: "none", border: "none", borderRadius: "var(--radius)", cursor: "pointer", color: "var(--text-primary)", transition: "background 0.12s", fontFamily: "inherit" }}
            >
              <XIcon />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1 }}>
            {mobileNavLink("/", "Analyze")}
            {mobileNavLink("/discover", "Discover")}
            {mobileNavLink("/recent", "Recent")}
            {mobileNavLink("/how-it-works", "How it Works")}
            {mobileNavLink("/api-docs", "API")}
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            {mobileNavLink("/badge", "Badge")}
            {mobileNavLink("https://github.com/truststar-app/truststar", "GitHub", true)}
          </nav>

          {/* Auth buttons */}
          <div style={{ padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)" }}>
            <Link
              href="/coming-soon"
              onClick={() => setMenuOpen(false)}
              style={{ display: "block", textAlign: "center", padding: "12px", fontSize: 15, fontWeight: 500, color: "var(--text-primary)", textDecoration: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-base)" }}
            >
              Log in
            </Link>
            <Link
              href="/coming-soon"
              onClick={() => setMenuOpen(false)}
              style={{ display: "block", textAlign: "center", padding: "12px", fontSize: 15, fontWeight: 600, color: "#fff", textDecoration: "none", borderRadius: "var(--radius)", background: "var(--accent)" }}
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
