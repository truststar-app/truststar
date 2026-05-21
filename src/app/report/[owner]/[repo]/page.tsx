import { notFound } from "next/navigation";
import Link from "next/link";
import type { TrustScore, TrustLabel } from "@/lib/types";

// ─── Fetch côté serveur ───────────────────────────────────────────────────────

async function getReport(
  owner: string,
  repo: string
): Promise<TrustScore | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
      next: { revalidate: 600 },
    });

    if (!response.ok) return null;

    return response.json() as Promise<TrustScore>;
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const report = await getReport(owner, repo);

  if (!report) notFound();

  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">⭐</span>
            <span className="font-bold text-lg tracking-tight">StarAudit</span>
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400 text-sm font-mono">
            {owner}/{repo}
          </span>
          <Link
            href="/"
            className="ml-auto text-xs text-gray-500 hover:text-white transition-colors
                       border border-gray-700 rounded px-3 py-1.5"
          >
            ← Nouvelle analyse
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">

        {/* Score principal */}
        <ScoreHero report={report} />

        {/* Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DimensionScore
            label="Qualité des comptes"
            score={report.dimensions.accounts}
            weight="35%"
            icon="👤"
          />
          <DimensionScore
            label="Comportement temporel"
            score={report.dimensions.temporal}
            weight="30%"
            icon="📈"
          />
          <DimensionScore
            label="Santé du projet"
            score={report.dimensions.health}
            weight="35%"
            icon="🏥"
          />
        </div>

        {/* Signaux détaillés */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <SignalsPanel
            title="👤 Signaux — Qualité des comptes"
            signals={[
              {
                label: "Comptes créés < 30j avant le star",
                value: report.signals.newAccountsRatio,
                format: "percent",
                danger: report.signals.newAccountsRatio > 0.3,
              },
              {
                label: "Comptes sans repo public",
                value: report.signals.noRepoRatio,
                format: "percent",
                danger: report.signals.noRepoRatio > 0.4,
              },
              {
                label: "Comptes sans followers/following",
                value: report.signals.noFollowersRatio,
                format: "percent",
                danger: report.signals.noFollowersRatio > 0.4,
              },
              {
                label: "Comptes sans avatar personnalisé",
                value: report.signals.noAvatarRatio,
                format: "percent",
                danger: report.signals.noAvatarRatio > 0.4,
              },
              {
                label: "Score lockstep (repos similaires)",
                value: report.signals.lockstepScore,
                format: "percent",
                danger: report.signals.lockstepScore > 0.2,
              },
            ]}
          />

          <SignalsPanel
            title="📈 Signaux — Comportement temporel"
            signals={[
              {
                label: "Z-score pic maximal détecté",
                value: report.signals.zScorePeak,
                format: "zscore",
                danger: report.signals.zScorePeak > 3,
              },
              {
                label: "Score de vélocité anormale",
                value: report.signals.velocityScore,
                format: "percent",
                danger: report.signals.velocityScore > 0.5,
              },
              {
                label: "Stars sur les 30 derniers jours",
                value: report.signals.recentStarsRatio,
                format: "percent",
                danger: report.signals.recentStarsRatio > 0.6,
              },
            ]}
          />

          <SignalsPanel
            title="🏥 Signaux — Santé du projet"
            signals={[
              {
                label: "Ratio fork / star",
                value: report.signals.forkStarRatio,
                format: "percent",
                danger: report.signals.forkStarRatio < 0.1,
              },
              {
                label: "Ratio contributeurs actifs",
                value: report.signals.activeContributorsRatio,
                format: "percent",
                danger: report.signals.activeContributorsRatio < 0.2,
              },
              {
                label: "Fréquence commits (par semaine)",
                value: report.signals.commitFrequency,
                format: "commits",
                danger: report.signals.commitFrequency < 1,
              },
              {
                label: "Ratio issues résolues",
                value: report.signals.issueResolutionRatio,
                format: "percent",
                danger: report.signals.issueResolutionRatio < 0.5,
              },
            ]}
          />

          {/* Méta */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 text-sm">
              ℹ️ Méta — Analyse
            </h3>
            <div className="space-y-3">
              <MetaRow
                label="Repo analysé"
                value={`${report.owner}/${report.repo}`}
              />
              <MetaRow
                label="Stargazers analysés"
                value={`${report.sampleSize}`}
              />
              <MetaRow
                label="Analysé le"
                value={new Date(report.analyzedAt).toLocaleString("fr-FR")}
              />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLabelConfig(label: TrustLabel): {
  color: string;
  bg: string;
  border: string;
  ring: string;
  description: string;
} {
  switch (label) {
    case "SAFE":
      return {
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        ring: "ring-emerald-500/20",
        description:
          "Ce repo présente des signaux sains. La popularité semble organique.",
      };
    case "SUSPICIOUS":
      return {
        color: "text-yellow-400",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        ring: "ring-yellow-500/20",
        description:
          "Certains signaux sont préoccupants. Une vérification manuelle est recommandée.",
      };
    case "DANGEROUS":
      return {
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        ring: "ring-red-500/20",
        description:
          "Signaux fortement suspects. Ce repo présente des patterns de fausse popularité.",
      };
  }
}

// ─── Composants ───────────────────────────────────────────────────────────────

function ScoreHero({ report }: { report: TrustScore }) {
  const config = getLabelConfig(report.label);

  return (
    <div className={`${config.bg} ${config.border} border rounded-2xl p-8`}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">

        {/* Cercle score */}
        <div
          className={`flex-shrink-0 w-28 h-28 rounded-full border-4 ${config.border}
                       flex flex-col items-center justify-center ring-4 ${config.ring}`}
        >
          <span className={`text-3xl font-bold ${config.color}`}>
            {report.score}
          </span>
          <span className="text-gray-500 text-xs">/100</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-2xl font-bold ${config.color}`}>
              {report.label}
            </span>
            <span
              className={`text-xs font-mono ${config.bg} ${config.border}
                           border rounded px-2 py-1 ${config.color}`}
            >
              Trust Score {report.score}
            </span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
            {config.description}
          </p>
        </div>

      </div>
    </div>
  );
}

function DimensionScore({
  label,
  score,
  weight,
  icon,
}: {
  label: string;
  score: number;
  weight: string;
  icon: string;
}) {
  const color =
    score >= 70 ? "text-emerald-400" :
    score >= 40 ? "text-yellow-400" :
    "text-red-400";

  const barColor =
    score >= 70 ? "bg-emerald-500" :
    score >= 40 ? "bg-yellow-500" :
    "bg-red-500";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm text-gray-300 font-medium">{label}</span>
        </div>
        <span className="text-xs text-gray-600 font-mono">{weight}</span>
      </div>

      <div className="flex items-end gap-3">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-gray-600 text-sm mb-1">/100</span>
      </div>

      <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

type SignalRow = {
  label: string;
  value: number;
  format: "percent" | "zscore" | "commits";
  danger: boolean;
};

function SignalsPanel({
  title,
  signals,
}: {
  title: string;
  signals: SignalRow[];
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4 text-sm">{title}</h3>
      <div className="space-y-4">
        {signals.map((signal) => (
          <SignalItem key={signal.label} signal={signal} />
        ))}
      </div>
    </div>
  );
}

function formatSignalValue(
  value: number,
  format: SignalRow["format"]
): string {
  switch (format) {
    case "percent":
      return `${Math.round(value * 100)}%`;
    case "zscore":
      return value.toFixed(2);
    case "commits":
      return `${value.toFixed(1)} / sem.`;
  }
}

function SignalItem({ signal }: { signal: SignalRow }) {
  const formattedValue = formatSignalValue(signal.value, signal.format);

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-400 text-xs leading-relaxed flex-1">
        {signal.label}
      </span>
      <span
        className={`text-xs font-mono font-semibold px-2 py-1 rounded flex-shrink-0
                    ${
                      signal.danger
                        ? "text-red-400 bg-red-500/10 border border-red-500/20"
                        : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    }`}
      >
        {formattedValue}
      </span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-300 text-xs font-mono text-right">
        {value}
      </span>
    </div>
  );
}
