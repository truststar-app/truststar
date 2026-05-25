import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Coming Soon — TrustStar",
};

export default function ComingSoonPage() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - var(--header-h))",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      <Image
        src="/14619e05-69a1-41be-86dc-5ecda5629b3a-removebg-preview.png"
        alt="TrustStar"
        width={64}
        height={64}
        style={{ marginBottom: 24 }}
      />

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.5px",
          marginBottom: 10,
        }}
      >
        Coming Soon
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          maxWidth: 320,
          marginBottom: 32,
        }}
      >
        This feature is under development. Stay tuned.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 20px",
          background: "var(--accent)",
          color: "#fff",
          borderRadius: "var(--radius)",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
          boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
        }}
      >
        ← Back to Home
      </Link>
    </main>
  );
}
