import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover Trending Repos | TrustStar",
  description: "Browse trending GitHub repos and popular npm packages with their trust scores and security signals.",
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
