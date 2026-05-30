import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — TrustStar",
  description: "TrustStar terms of service. Free, open-source trust analysis platform.",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "calc(var(--header-h, 48px) + 48px) 24px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
          ← Home
        </Link>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.8px", color: "var(--text-primary)", marginBottom: 8 }}>
        Terms of Service
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 48 }}>
        Last updated: May 30, 2026
      </p>

      <Section title="Acceptance">
        <p>
          By using TrustStar (truststar.co), you agree to these terms. If you do not agree,
          please do not use the service.
        </p>
      </Section>

      <Section title="What TrustStar is">
        <p>
          TrustStar is a free, open-source platform that analyzes publicly available GitHub and
          npm data to produce trust signals. It is an informational tool, not a security guarantee.
          Results are probabilistic indicators — not definitive proof of fraud or safety.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use TrustStar to harass, defame, or target specific individuals or organizations.</li>
          <li>Submit automated requests at volumes that degrade service availability for other users.</li>
          <li>Misrepresent TrustStar scores as official certifications or legal assessments.</li>
          <li>Attempt to circumvent rate limits or access systems beyond the public API.</li>
        </ul>
      </Section>

      <Section title="API usage">
        <p>
          The TrustStar API is free and requires no authentication. Results are cached per
          repository. Excessive automated usage may be rate-limited without notice to preserve
          availability for all users.
        </p>
      </Section>

      <Section title="Disclaimer of warranties">
        <p>
          TrustStar is provided "as is" without warranty of any kind. We make no guarantees about
          the accuracy, completeness, or timeliness of analysis results. A SAFE verdict does not
          guarantee a repository is free from malicious code. A DANGEROUS verdict does not
          constitute proof of fraud. Always conduct your own due diligence before depending on
          any open-source project.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, TrustStar and its operators shall not be liable
          for any indirect, incidental, or consequential damages arising from your use of the
          platform or reliance on its results.
        </p>
      </Section>

      <Section title="Open source">
        <p>
          TrustStar is open source under the MIT License. The source code is available on{" "}
          <a
            href="https://github.com/truststar-app/truststar"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            GitHub
          </a>
          . You are free to fork, modify, and self-host it subject to the MIT License terms.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms at any time. Continued use of TrustStar after changes
          constitutes acceptance of the updated terms. The "Last updated" date above reflects
          the most recent revision.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions?{" "}
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
