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
    "TrustStar is the open-source trust engine for the open source ecosystem. Detect fake GitHub stars, analyze npm packages, and scan code for security risks.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "TrustStar",
    description:
      "TrustStar is the open-source trust engine for the open source ecosystem. Detect fake GitHub stars, analyze npm packages, and scan code for security risks.",
    siteName: "TrustStar",
    url: "https://truststar.co",
    type: "website",
    images: ["https://truststar.co/14619e05-69a1-41be-86dc-5ecda5629b3a-removebg-preview.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustStar — Trust starts with transparency",
    description:
      "TrustStar is the open-source trust engine for the open source ecosystem. Detect fake GitHub stars, analyze npm packages, and scan code for security risks.",
    images: ["https://truststar.co/14619e05-69a1-41be-86dc-5ecda5629b3a-removebg-preview.png"],
  },
  metadataBase: new URL("https://truststar.co"),
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
