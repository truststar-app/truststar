import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAFAFA",
          fontFamily: "sans-serif",
          padding: "64px 80px",
        }}
      >
        {/* Top: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 36, height: 36, background: "#D93636", borderRadius: 10 }} />
          <span style={{ fontSize: 26, fontWeight: 700, color: "#0C0C0D", letterSpacing: "-0.5px" }}>TrustStar</span>
          <span style={{ marginLeft: 8, fontSize: 14, color: "#A0A0AB" }}>truststar.co</span>
        </div>

        {/* Center: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#0C0C0D",
              letterSpacing: "-2px",
              lineHeight: 1.05,
            }}
          >
            Trust starts with<br />transparency.
          </span>
          <span style={{ fontSize: 22, color: "#6B6B76", lineHeight: 1.5, maxWidth: 700 }}>
            Detect fake GitHub stars, verify npm packages, and scan code for security risks — before you depend on them.
          </span>
        </div>

        {/* Bottom: stats */}
        <div style={{ display: "flex", gap: 48, alignItems: "flex-end" }}>
          {[
            { num: "6M+", label: "Fake stars on GitHub" },
            { num: "18,617", label: "Repos affected" },
            { num: "$0.03", label: "Per star on the market" },
          ].map((s) => (
            <div key={s.num} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: "#D93636", letterSpacing: "-1px" }}>{s.num}</span>
              <span style={{ fontSize: 14, color: "#A0A0AB" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
