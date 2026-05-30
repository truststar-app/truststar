import type { Metadata } from "next";
import { Suspense } from "react";
import ReportClientPage from "@/components/ReportClientPage";

const SITE = "https://truststar.co";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}): Promise<Metadata> {
  const { owner, repo } = await params;
  const slug = `${owner}/${repo}`;
  const title = `${slug} — Trust Score | TrustStar`;
  const description = `Fake star analysis and trust score for ${slug}. Verify stargazer authenticity with TrustStar.`;
  const ogImage = `${SITE}/api/og/${owner}/${repo}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/report/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `TrustStar — ${slug}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  return (
    <Suspense>
      <ReportClientPage owner={owner} repo={repo} />
    </Suspense>
  );
}
