# TrustStar

**Trust starts with transparency.**

TrustStar is a trust layer for the npm and GitHub ecosystems. It detects fake stars, flags suspicious packages, and surfaces security signals — so developers can make informed decisions before adding a dependency.

Live at **[truststar.co](https://truststar.co)**

---

## Why it exists

A 2026 ICSE study ([He et al.](https://arxiv.org/abs/2412.13459)) identified **6 million suspected fake stars** across 18,617 GitHub repositories — including repos that reached GitHub Trending. Star counts, once a proxy for trust, are now a target for manipulation.

TrustStar gives developers a second opinion.

---

## What it does

### Trust Score
Analyzes a GitHub repository across four dimensions:

- **Account Quality** — profiles of the accounts that starred the repo (age, repos, followers, activity)
- **Temporal Behavior** — star velocity, burst patterns, statistical anomalies in the star curve
- **Project Health** — commit frequency, contributor activity, fork/star ratio, issue resolution
- **Authenticity** — coordinated starring patterns, low-activity cluster detection

Each repo gets a score from 0–100 and a label: `SAFE` · `CAUTION` · `SUSPICIOUS` · `DANGEROUS` · `NEW`

### npm Check
Cross-references a package's download stats with its GitHub signals. Flags inconsistencies like 200k weekly downloads with 12 stars, or install scripts on a brand-new package.

### Code Scan
Static analysis of a repository's source code. Detects hardcoded IPs, suspicious network calls, obfuscated payloads, and dangerous execution patterns. Returns per-finding severity with file locations.

### Embeddable Badge
```markdown
[![TrustStar](https://truststar.co/api/badge/owner/repo)](https://truststar.co/report/owner/repo)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables |
| Fonts | Poppins + JetBrains Mono |
| Caching | In-memory TTL + Upstash Redis |
| Deployment | Vercel |
| Data sources | GitHub API, npm registry |

---

## Getting started

### Prerequisites

- Node.js 20+
- A GitHub personal access token (public repo read access is enough)

### Installation

```bash
git clone https://github.com/truststar-app/truststar.git
cd truststar
npm install
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub PAT — increases rate limit from 60 to 5,000 req/h |
| `NEXT_PUBLIC_BASE_URL` | Yes | `http://localhost:3000` locally |
| `UPSTASH_REDIS_REST_URL` | No | Enables persistent recent-audits feed |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash auth token |

Scoring thresholds can be tuned via environment variables — see `.env.example` for the full list.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
├── app/                         # Next.js App Router pages and API routes
│   ├── api/                     # REST endpoints (analyze, npm-check, skill-audit, badge)
│   ├── report/[owner]/[repo]/   # Trust Score result page
│   ├── npm/[package]/           # npm Check result page
│   └── skill/[slug]/            # Code Scan result page
├── components/                  # Header, Footer, SearchBar
└── lib/
    ├── github/                  # GitHub API client and data fetchers
    ├── scoring/                 # Trust Score engine (four dimensions)
    ├── npm/                     # npm analyzer
    └── skill-audit/             # Static code analysis engine
```

---

## Scoring methodology

The Trust Score is computed from four independent dimensions, each weighted. The final score determines the label:

| Label | Meaning |
|---|---|
| `SAFE` | Strong signals across all dimensions |
| `CAUTION` | Mixed signals or override triggered |
| `SUSPICIOUS` | Multiple thresholds exceeded |
| `DANGEROUS` | Critical anomalies detected |
| `NEW` | Insufficient data (< 50 stars or < 90 days old) |

Full methodology is documented at [truststar.co/how-it-works](https://truststar.co/how-it-works).

The detection logic draws on CopyCatch (Facebook, 2013) and the statistical approach from He et al. (ICSE 2026). Specific thresholds and signal weights are configurable via environment variables and are not hardcoded in this repository.

---

## Reliability

| Engine | Accuracy | Benchmark size |
|---|---|---|
| Trust Score | 100% | 29 repos |
| npm Check | 100% | 45 packages |
| Code Scan | 94% | 19 repos, 8 iterations |

---

## API

TrustStar exposes a public REST API. Full documentation at [truststar.co/api-docs](https://truststar.co/api-docs).

```bash
# Trust Score
GET https://truststar.co/api/analyze?owner=facebook&repo=react

# npm Check
GET https://truststar.co/api/npm-check?package=express

# Dynamic badge
GET https://truststar.co/api/badge/facebook/react
```

---

## Research foundation

> He, Yang, Burckhardt, Kapravelos, Vasilescu, Kästner.
> *"Six Million (Suspected) Fake Stars on GitHub: A Growing Spiral of Popularity Contests, Spam, and Malware."*
> ICSE 2026. [arxiv.org/abs/2412.13459](https://arxiv.org/abs/2412.13459)

Key findings that motivated this project:

- 6 million suspected fake stars across GitHub
- 18,617 repositories involved, 301,000 accounts implicated
- $0.03–$0.85 per star on the open market
- 78 repositories reached GitHub Trending via purchased stars

---

## Contributing

Issues and pull requests are welcome. Please open an issue before working on significant changes so we can align on direction.

---

## License

MIT
