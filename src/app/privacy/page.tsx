import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — TrustStar",
  description: "TrustStar privacy policy. No personal data stored, stateless API, minimal data collection.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "calc(var(--header-h, 48px) + 48px) 24px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
          ← Home
        </Link>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.8px", color: "var(--text-primary)", marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 48 }}>
        Last updated: May 30, 2026
      </p>

      <Section title="The short version">
        <p>
          TrustStar does not collect, store, or sell personal data. The analysis API is fully
          stateless — we do not log your queries or associate analysis results with your identity.
          The only data we retain is a short-lived cache of analysis results (public GitHub metrics)
          to power the Recent Audits feed, which contains no personal information.
        </p>
      </Section>

      <Section title="What we analyze">
        <p>
          When you analyze a GitHub repository, TrustStar queries the public GitHub API on your
          behalf. All data processed — stargazer profiles, commit history, repository metadata — is
          already public on GitHub. We do not access private repositories, authenticated sessions,
          or any data that is not publicly visible.
        </p>
      </Section>

      <Section title="Data we store">
        <p>
          We use a Redis cache to store aggregated analysis results (score, label, signals) for
          recently analyzed repositories. This cache:
        </p>
        <ul>
          <li>Contains only public repository data, not user identity or IP addresses.</li>
          <li>Expires automatically — results are not retained indefinitely.</li>
          <li>Powers the public Recent Audits feed (visible to all visitors).</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          We do not use cookies for tracking. No analytics scripts (Google Analytics, Mixpanel,
          etc.) are loaded on TrustStar pages.
        </p>
      </Section>

      <Section title="Email collection (waitlist)">
        <p>
          If you sign up via the "Stay updated" form, we store your email address solely to send
          you product updates. We do not share this list with third parties. You can unsubscribe
          at any time by replying to any email we send.
        </p>
      </Section>

      <Section title="Third-party services">
        <p>
          TrustStar uses the following external services:
        </p>
        <ul>
          <li><strong>GitHub API</strong> — to fetch public repository and stargazer data.</li>
          <li><strong>npm Registry</strong> — to fetch public package metadata and download counts.</li>
          <li><strong>Vercel</strong> — hosting and edge network. Vercel may log standard HTTP request metadata (IP, user-agent) per their own privacy policy.</li>
          <li><strong>Upstash Redis</strong> — short-lived result cache. No personal data is written.</li>
        </ul>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy?{" "}
          <a href="mailto:support@truststar.co" style={{ color: "var(--accent)" }}>
            support@truststar.co
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--text-primary)", marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  );
}
