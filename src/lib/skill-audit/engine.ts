import type {
  SkillSafetyScore,
  SkillFinding,
  FetchedSkillData,
} from "./types";
import type { ParsedSkillMd } from "./parser";

type ComputeParams = {
  slug: string;
  repoUrl: string;
  fetchedData: FetchedSkillData;
  parsedSkillMd: ParsedSkillMd;
  allFindings: SkillFinding[];
  popularityScore: number;
};

function deductFromFindings(findings: SkillFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "CRITICAL") score -= 25;
    else if (f.severity === "HIGH") score -= 15;
    else if (f.severity === "MEDIUM") score -= 8;
    else if (f.severity === "LOW") score -= 3;
    // INFO: no deduction
  }
  return Math.max(0, score);
}

function getLabel(
  score: number
): "SAFE" | "SUSPICIOUS" | "DANGEROUS" {
  if (score >= 70) return "SAFE";
  if (score >= 40) return "SUSPICIOUS";
  return "DANGEROUS";
}

export function computeSkillSafetyScore(
  params: ComputeParams
): SkillSafetyScore {
  const { slug, repoUrl, fetchedData, allFindings, popularityScore } = params;

  // ── Separate findings by dimension ─────────────────────────────────────────

  const permissionsFindings = allFindings.filter(
    (f) => f.category === "permissions"
  );

  const codeSafetyFindings = allFindings.filter((f) =>
    ["network", "filesystem", "execution", "obfuscation"].includes(f.category)
  );

  const dependencyFindings = allFindings.filter(
    (f) => f.category === "dependencies"
  );

  // ── Dimension scores ────────────────────────────────────────────────────────

  const popularity = Math.max(0, Math.min(100, Math.round(popularityScore)));

  const permissions = deductFromFindings(permissionsFindings);

  const codeSafety = deductFromFindings(codeSafetyFindings);

  // Ecosystem starts from dependency findings + meta signals
  let ecosystem = deductFromFindings(dependencyFindings);

  // Extra ecosystem signals from metadata
  const meta = fetchedData.metadata;
  if (meta.authorAccountAge !== undefined && meta.authorAccountAge < 30) {
    ecosystem -= 20;
  }
  if (meta.authorPublicRepos !== undefined && meta.authorPublicRepos === 0) {
    ecosystem -= 15;
  }

  const repoCreatedAt = new Date(fetchedData.repoInfo.created_at);
  const repoAgeDays = Math.floor(
    (Date.now() - repoCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (repoAgeDays < 7) {
    ecosystem -= 15;
  }

  const filePaths = fetchedData.files.map((f) => f.path.toLowerCase());
  const hasReadme = filePaths.some((p) => p.endsWith("readme.md") || p === "readme.md");
  const hasLicense = filePaths.some(
    (p) => p.endsWith("license") || p.endsWith("license.md") || p.endsWith("license.txt")
  );

  if (!hasReadme) ecosystem -= 5;
  if (!hasLicense) ecosystem -= 5;

  ecosystem = Math.max(0, ecosystem);

  // ── Global score ────────────────────────────────────────────────────────────

  const score = Math.round(
    popularity * 0.3 +
    permissions * 0.3 +
    codeSafety * 0.25 +
    ecosystem * 0.15
  );

  const finalFindings = [...allFindings];

  if (!fetchedData.metadata.hasSkillMd) {
    finalFindings.push({
      id: "META-001",
      severity: "INFO",
      category: "permissions",
      title: "No SKILL.md found",
      description:
        "This repository was analyzed as a generic codebase, not a registered OpenClaw skill.",
      file: "(repository root)",
      evidence: "SKILL.md not present",
      recommendation:
        "Add a SKILL.md to declare this as an OpenClaw skill and document its permissions.",
    });
  }

  return {
    slug,
    repoUrl,
    score,
    label: getLabel(score),
    dimensions: {
      popularity,
      permissions,
      codeSafety,
      ecosystem,
    },
    findings: finalFindings,
    metadata: fetchedData.metadata,
    analyzedAt: new Date().toISOString(),
  };
}
