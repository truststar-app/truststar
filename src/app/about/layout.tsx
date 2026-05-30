import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — TrustStar",
  description: "The story behind TrustStar.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
