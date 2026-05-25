"use client";

import { useState } from "react";

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL ?? "https://truststar.co";

// ─── Types ────────────────────────────────────────────────────────────────────

type Endpoint = {
  method: "POST" | "GET";
  path: string;
  description: string;
  bodyExample?: string;
  queryParams?: string;
  responseExample: string;
  tryBody?: string;
};

// ─── Endpoint definitions ────────────────────────────────────────────────────

const ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/api/analyze",
    description: "Analyze a GitHub repository's trust signals — fake star detection, account quality, temporal behavior, and project health.",
    bodyExample: `{
  "repoUrl": "https://github.com/owner/repo",
  "force": true
}`,
    responseExample: `{
  "repo": "express",
  "owner": "expressjs",
  "score": 78,
  "label": "SAFE",
  "dimensions": {
    "accounts": 99,
    "temporal": 87,
    "health": 70
  },
  "signals": {
    "newAccountsRatio": 0.02,
    "velocityScore": 0.04,
    "recentStarsRatio": 0.08,
    "forkStarRatio": 0.34
  },
  "sampleSize": 200,
  "analyzedAt": "2026-05-26T10:00:00.000Z"
}`,
    tryBody: JSON.stringify({ repoUrl: "https://github.com/expressjs/express" }, null, 2),
  },
  {
    method: "POST",
    path: "/api/npm-check",
    description: "Cross-reference npm download counts with GitHub stars and metadata to detect inconsistencies.",
    bodyExample: `{
  "package": "express"
}`,
    responseExample: `{
  "package": "express",
  "signals": [
    { "type": "positive", "label": "High download volume", "detail": "25M+ weekly downloads" },
    { "type": "positive", "label": "GitHub stars align", "detail": "65k stars, consistent with usage" }
  ],
  "analyzedAt": "2026-05-26T10:00:00.000Z"
}`,
    tryBody: JSON.stringify({ package: "express" }, null, 2),
  },
  {
    method: "POST",
    path: "/api/skill-audit",
    description: "Static security analysis of a GitHub repository's code — network calls, filesystem access, execution, obfuscation, and suspicious dependencies.",
    bodyExample: `{
  "repoUrl": "https://github.com/owner/repo"
}`,
    responseExample: `{
  "repo": "express",
  "owner": "expressjs",
  "score": 92,
  "label": "SAFE",
  "findings": [
    {
      "severity": "LOW",
      "category": "network",
      "message": "HTTP request detected",
      "file": "lib/router/index.js",
      "line": 12
    }
  ],
  "analyzedAt": "2026-05-26T10:00:00.000Z"
}`,
    tryBody: JSON.stringify({ repoUrl: "https://github.com/expressjs/express" }, null, 2),
  },
  {
    method: "GET",
    path: "/api/recent-audits",
    description: "Retrieve the most recent analyses run by the community.",
    queryParams: "?limit=20&type=trust-score",
    responseExample: `{
  "audits": [
    {
      "id": "abc123",
      "type": "trust-score",
      "slug": "expressjs/express",
      "score": 78,
      "label": "SAFE",
      "analyzedAt": "2026-05-26T10:00:00.000Z"
    }
  ],
  "total": 42
}`,
    tryBody: "",
  },
  {
    method: "GET",
    path: "/api/badge/{owner}/{repo}",
    description: "Dynamic SVG badge showing the trust score. Embed in your README to display live results.",
    responseExample: `<!-- Content-Type: image/svg+xml -->
<!-- Example Markdown -->
![TrustStar](https://truststar.co/api/badge/expressjs/express)`,
    tryBody: "",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: "POST" | "GET" }) {
  const isPost = method === "POST";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.5px",
        background: isPost ? "#F0FDF4" : "#EFF6FF",
        color: isPost ? "#16A34A" : "#2563EB",
        border: `1px solid ${isPost ? "#BBF7D0" : "#BFDBFE"}`,
        flexShrink: 0,
      }}
    >
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 500,
        color: copied ? "var(--safe)" : "var(--text-tertiary)",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: 4,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 6,
        }}
      >
        <CopyButton text={code} />
      </div>
      <pre
        style={{
          background: "var(--bg-hover)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "14px 16px",
          overflowX: "auto",
          fontSize: 12,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          lineHeight: 1.6,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TryItPanel({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(endpoint.tryBody ?? "");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendRequest() {
    setLoading(true);
    setResponse(null);
    try {
      let url = `${BASE_URL}${endpoint.path}`;
      if (endpoint.method === "GET") {
        if (endpoint.path.includes("{owner}")) {
          url = `${BASE_URL}/api/badge/expressjs/express`;
        } else if (endpoint.queryParams) {
          url += endpoint.queryParams;
        }
      }
      const opts: RequestInit =
        endpoint.method === "POST"
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body,
            }
          : { method: "GET" };

      const res = await fetch(url, opts);
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("image/svg+xml")) {
        setResponse(`<!-- SVG badge received (status ${res.status}) -->\n<!-- Embed as: ![TrustStar](${url}) -->`);
      } else {
        const json = await res.json();
        setResponse(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      setResponse(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--accent)",
          background: "var(--accent-subtle)",
          border: "1px solid #FECACA",
          borderRadius: 6,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "background 0.15s",
        }}
      >
        {open ? "Close" : "Try it →"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          {endpoint.method === "POST" && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                Request body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "#fff",
                  color: "var(--text-primary)",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <button
            onClick={sendRequest}
            disabled={loading}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: loading ? "var(--text-tertiary)" : "var(--accent)",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Sending…" : "Send Request"}
          </button>

          {response !== null && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                Response
              </div>
              <CodeBlock code={response} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const fullPath =
    endpoint.queryParams
      ? `${endpoint.path}${endpoint.queryParams}`
      : endpoint.path;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 24,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <MethodBadge method={endpoint.method} />
        <code
          style={{
            fontSize: 14,
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--text-primary)",
            fontWeight: 500,
          }}
        >
          {fullPath}
        </code>
      </div>

      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 16px" }}>
        {endpoint.description}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: endpoint.bodyExample ? "1fr 1fr" : "1fr",
          gap: 16,
        }}
      >
        {endpoint.bodyExample && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 8,
              }}
            >
              Request body
            </div>
            <CodeBlock code={endpoint.bodyExample} />
          </div>
        )}

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            Response example
          </div>
          <CodeBlock code={endpoint.responseExample} />
        </div>
      </div>

      <TryItPanel endpoint={endpoint} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  return (
    <main
      style={{
        maxWidth: "var(--max-w, 900px)",
        margin: "0 auto",
        padding: "calc(var(--header-h, 56px) + 48px) 24px 80px",
      }}
    >
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "var(--accent)",
              background: "var(--accent-subtle)",
              border: "1px solid #FECACA",
              padding: "3px 10px",
              borderRadius: 20,
            }}
          >
            REST API
          </span>
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.8px",
            lineHeight: 1.15,
            margin: "0 0 12px",
          }}
        >
          API Documentation
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 560, margin: 0 }}>
          Integrate TrustStar into your CI/CD pipeline, scripts, or applications.
          No authentication required.
        </p>
      </div>

      {/* Endpoints */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 48 }}>
        {ENDPOINTS.map((ep) => (
          <EndpointCard key={ep.path} endpoint={ep} />
        ))}
      </div>

      {/* Rate limits */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 24,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 10px",
          }}
        >
          Rate Limits
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          TrustStar API is free and does not require authentication. Please use responsibly —
          excessive requests may be throttled. Results are cached for 10 minutes per repository.
        </p>
      </div>
    </main>
  );
}
