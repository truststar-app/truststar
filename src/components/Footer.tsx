"use client";

import Image from "next/image";
import Link from "next/link";

const GH = "https://github.com/truststar-app/truststar";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "48px 24px 32px",
      }}
    >
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <Image
              src="/30px-logo.webp"
              alt="TrustStar"
              width={24}
              height={24}
              style={{ flexShrink: 0 }}
            />
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.4px" }}>
              TrustStar
            </span>
          </Link>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              lineHeight: 1.7,
              marginTop: 10,
              maxWidth: 220,
            }}
          >
            The trust platform for open source. Verify before you depend.
          </p>
        </div>

        <FooterCol title="Product">
          <FooterLink href="/">Trust Score</FooterLink>
          <FooterLink href="/npm/express">npm Check</FooterLink>
          <FooterLink href="/skill/expressjs/express">Code Scan</FooterLink>
          <FooterLink href="/badge">Badge</FooterLink>
        </FooterCol>

        <FooterCol title="Resources">
          <FooterLink href="/how-it-works">How it Works</FooterLink>
          <FooterLink href="/discover">Discover</FooterLink>
          <FooterLink href="/recent">Recent Audits</FooterLink>
          <FooterLink href="/api-docs">API</FooterLink>
          <FooterLink href="/how-it-works#contact">Contact</FooterLink>
        </FooterCol>

        <FooterCol title="Open Source">
          <FooterLink href={GH} external>GitHub</FooterLink>
        </FooterCol>
      </div>

      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "20px auto 0",
          paddingTop: 16,
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          © 2026 TrustStar — Open source under MIT.
        </span>
        <a
          href={GH}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            textDecoration: "none",
            transition: "color 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
          }}
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const style: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    color: "var(--text-tertiary)",
    textDecoration: "none",
    padding: "3px 0",
    transition: "color 0.12s",
  };

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      style={style}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
      }}
    >
      {children}
    </Link>
  );
}
