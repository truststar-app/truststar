import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent Audits — Live Community Feed | TrustStar",
  description: "Real-time feed of trust score analyses, npm checks, and code scans run by the community.",
};

export default function RecentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
