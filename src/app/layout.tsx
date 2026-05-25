import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrustStar — Trust starts with transparency",
  description:
    "TrustStar is the open-source trust engine for GitHub repos and OpenClaw skills. Detect fake stars, analyze code security, and make safe adoption decisions.",
  icons: {
    icon: "/30px-logo.webp",
    shortcut: "/30px-logo.webp",
    apple: "/30px-logo.webp",
  },
  openGraph: {
    title: "TrustStar",
    description:
      "TrustStar is the open-source trust engine for GitHub repos and OpenClaw skills. Detect fake stars, analyze code security, and make safe adoption decisions.",
    siteName: "TrustStar",
    type: "website",
    images: ["/14619e05-69a1-41be-86dc-5ecda5629b3a-removebg-preview.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${jetbrainsMono.variable}`}>
        <Header />
        <div style={{ paddingTop: "var(--header-h)" }}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
