import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrustStar Badge — Embed Your Trust Score | TrustStar",
  description: "Add a dynamic TrustStar badge to your GitHub repository and show your verified trust score.",
};

export default function BadgeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
