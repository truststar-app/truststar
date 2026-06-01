import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SkillClientPage from "@/components/SkillClientPage";

const SITE = "https://truststar.co";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug.length < 2) return { title: "Code Scan | TrustStar" };

  const owner = slug[0];
  const repo = slug[1];
  const repoSlug = `${owner}/${repo}`;
  const title = `${repoSlug} — Code Scan | TrustStar`;
  const description = `Static security analysis for ${repoSlug}. Scanned by TrustStar.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/skill/${repoSlug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SkillReportPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    notFound();
  }

  const owner = slug[0];
  const repo = slug[1];

  return (
    <Suspense>
      <SkillClientPage owner={owner} repo={repo} />
    </Suspense>
  );
}
