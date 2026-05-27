import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | TrustStar",
  description: "Transparent methodology behind TrustStar. How we detect fake stars, analyze npm packages, and scan code for security risks.",
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
