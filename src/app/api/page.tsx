"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
    const urlPattern = /github\.com\/([^/]+)\/([^/\s?#]+)/;
    const shortPattern = /^([^/]+)\/([^/\s]+)$/;

    const urlMatch = input.match(urlPattern);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };

    const shortMatch = input.trim().match(shortPattern);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };

    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError("Invalid URL. Example: https://github.com/expressjs/express");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json() as { error: string };
        throw new Error(data.error ?? "Unknown error");
      }

      router.push(`/report/${parsed.owner}/${parsed.repo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <span className="text-2xl font-bold text-yellow-400">★</span>
          <span className="font-bold text-lg tracking-tight">TrustStar</span>
          <span className="ml-auto text-xs text-gray-500 border border-gray-700 rounded px-2 py-1">
            Beta
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-2xl w-full mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 text-yellow-400 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Fake GitHub popularity detection
          </div>

          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
            Trust only{" "}
            <span className="text-yellow-400">real stars</span>
          </h1>

          <p className="text-gray-400 text-lg mb-12 leading-relaxed">
            TrustStar analyzes the quality of a GitHub repo&apos;s stargazers and computes
            a Trust Score from 0 to 100. Ideal for VCs, CTOs, and acquisition teams.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3
                           text-white placeholder-gray-600 focus:outline-none focus                           focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20
                           transition-colors text-sm"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700
                           disabled:text-gray-500 disabled:cursor-not-allowed
                           text-gray-950 font-semibold px-6 py-3 rounded-lg
                           transition-colors text-sm whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analyzing…
                  </span>
                ) : (
                  "Analyze →"
                )}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-red-400 text-sm text-left">{error}</p>
            )}

            <p className="mt-3 text-gray-600 text-xs text-left">
              Exemple : https://github.com/expressjs/express
            </p>
          </form>
        </div>

        {/* Metrics explained */}
        <div className="max-w-4xl w-full mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <DimensionCard
            icon="U"
            title="Account Quality"
            weight="35%"
            description="Detects recent, empty accounts with no followers or exhibiting lockstep behavior."
          />
          <DimensionCard
            icon="↑"
            title="Temporal Behavior"
            weight="30%"
            description="Analyzes abnormal peaks via Z-score, velocity, and recent star bursts."
          />
          <DimensionCard
            icon="+"
            title="Project Health"
            weight="35%"
            description="Evaluates fork/star ratio, commit activity, and issue resolution rate."
          />
        </div>

        {/* Footer note */}
        <p className="mt-16 text-gray-700 text-xs text-center">
          Analysis based on a sample of up to 200 stargazers · Public GitHub API
        </p>
      </section>
    </main>
  );
}

// ─── Dimension card component ────────────────────────────────────────────────

function DimensionCard({
  icon,
  title,
  weight,
  description,
}: {
  icon: string;
  title: string;
  weight: string;
  description: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left
                    hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-mono text-gray-500 border border-gray-700
                         rounded px-2 py-0.5">
          {weight}
        </span>
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
