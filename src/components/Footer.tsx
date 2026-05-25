"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "48px 24px 32px",
        marginTop: 48,
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
          gap: 40,
        }}
      >
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
            <div
              style={{
                width: 24,
                height: 24,
                background: "var(--accent)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 3px rgba(217,54,54,0.25)",
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" width={14} height={14}>
                <path
                  d="M8 1L10.5 5.5L15 6.5L11.5 10L12.5 15L8 12.5L3.5 15L4.5 10L1 6.5L5.5 5.5L8 1Z"
                  fill="white"
                />
              </svg>
            </div>
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
          <FooterLink href="#">Skill Audit</FooterLink>
          <FooterLink href="#">RepoShield</FooterLink>
          <FooterLink href="#">npm Check</FooterLink>
          <FooterLink href="#">Pricing</FooterLink>
          <FooterLink href="#">Changelog</FooterLink>
        </FooterCol>

        <FooterCol title="Resources">
          <FooterLink href="#">Documentation</FooterLink>
          <FooterLink href="#">API Reference</FooterLink>
          <FooterLink href="#">Blog</FooterLink>
          <FooterLink href="#">Dev Blog</FooterLink>
          <FooterLink href="#">Community</FooterLink>
          <FooterLink href="#">GitHub</FooterLink>
        </FooterCol>

        <FooterCol title="Company">
          <FooterLink href="#">About</FooterLink>
          <FooterLink href="#">News</FooterLink>
          <FooterLink href="#">Contact</FooterLink>
          <FooterLink href="#">Careers</FooterLink>
          <FooterLink href="#">Legal</FooterLink>
          <FooterLink href="#">Privacy</FooterLink>
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
        <div style={{ display: "flex", gap: 16 }}>
          {["GitHub", "Twitter", "Discord"].map((label) => (
            <Link
              key={label}
              href="#"
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
              {label}
            </Link>
          ))}
        </div>
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

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        fontSize: 13,
        color: "var(--text-tertiary)",
        textDecoration: "none",
        padding: "3px 0",
        transition: "color 0.12s",
      }}
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
