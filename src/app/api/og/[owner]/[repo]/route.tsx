import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://truststar.co";

const COLORS = {
  SAFE:       { fg: "#16A34A", bg: "#F0FDF4", bar: "#16A34A" },
  SUSPICIOUS: { fg: "#D97706", bg: "#FFFBEB", bar: "#D97706" },
  DANGEROUS:  { fg: "#DC2626", bg: "#FEF2F2", bar: "#DC2626" },
  NEW:        { fg: "#6B7280", bg: "#F4F4F5", bar: "#9CA3AF" },
} as const;

type Label = keyof typeof COLORS;

type ReportData = {
  score: number;
  label: Label;
  owner: string;
  repo: string;
  dimensions: { accounts: number; temporal: number; health: number };
};

async function fetchReport(owner: string, repo: string): Promise<ReportData | null> {
  try {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<ReportData>;
  } catch {
    return null;
  }
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6B6B76" }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ display: "flex", height: 6, background: "#E4E4E7", borderRadius: 3 }}>
        <div style={{ display: "flex", width: `${value}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;
  const report = await fetchReport(owner, repo);

  const label: Label = (report?.label as Label) ?? "NEW";
  const score = report?.score ?? 0;
  const cfg = COLORS[label] ?? COLORS.NEW;
  const slug = `${owner}/${repo}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#FAFAFA",
          fontFamily: "sans-serif",
          padding: "52px 64px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 32, height: 32, background: "#D93636", borderRadius: 8 }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: "#0C0C0D", letterSpacing: "-0.5px" }}>TrustStar</span>
          </div>
          <span style={{ fontSize: 15, color: "#A0A0AB" }}>truststar.co</span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, gap: 56 }}>
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#A0A0AB", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>
              Trust Score
            </span>
            <span style={{ fontSize: 34, fontWeight: 700, color: "#0C0C0D", letterSpacing: "-1px", marginBottom: 20, lineHeight: 1.1 }}>
              {slug}
            </span>

            {/* Label badge */}
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: 10,
                background: cfg.bg,
                border: `1.5px solid ${cfg.fg}`,
                borderRadius: 10,
                padding: "10px 20px",
                marginBottom: 32,
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 800, color: cfg.fg, fontFamily: "monospace" }}>{score}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: cfg.fg }}>{label}</span>
            </div>

            <span style={{ fontSize: 14, color: "#6B6B76", lineHeight: 1.6 }}>
              {label === "SAFE"
                ? "This repository shows healthy signals. Popularity appears organic."
                : label === "SUSPICIOUS"
                ? "Some signals are concerning. Manual review recommended."
                : label === "DANGEROUS"
                ? "Strongly suspicious signals consistent with a fake star campaign."
                : "Too new or too few stars for a reliable analysis."}
            </span>
          </div>

          {/* Right: dimensions */}
          <div style={{ display: "flex", flexDirection: "column", width: 340 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#A0A0AB", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 24 }}>
              Dimensions
            </span>
            <div style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", border: "1px solid #E4E4E7", borderRadius: 16, padding: "24px 28px" }}>
              <Bar label="Account Quality" value={report?.dimensions.accounts ?? 0} color={cfg.bar} />
              <Bar label="Temporal Behavior" value={report?.dimensions.temporal ?? 0} color={cfg.bar} />
              <Bar label="Project Health" value={report?.dimensions.health ?? 0} color={cfg.bar} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", marginTop: 28, paddingTop: 20, borderTop: "1px solid #E4E4E7" }}>
          <span style={{ fontSize: 13, color: "#A0A0AB" }}>
            Fake star detection · npm analysis · code scan — truststar.co
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
