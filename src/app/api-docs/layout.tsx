import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation | TrustStar",
  description: "Integrate TrustStar into your tools. REST API for trust score analysis, npm checks, and code scans.",
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
