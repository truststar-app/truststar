# TrustStar

**Trust starts with transparency.**

TrustStar is an open-source trust engine for the open source ecosystem. It helps developers and organizations verify the reliability of GitHub repositories, npm packages, and AI agent skills before depending on them.

## Features

- **Trust Score** — Detect fake GitHub stars, bot accounts, and artificial popularity
- **npm Check** — Cross-reference download counts with community signals
- **Code Scan** — Static analysis for dangerous patterns in source code

## Live

[truststar.co](https://truststar.co)

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Vercel

## Getting Started

```bash
git clone https://github.com/truststar-app/truststar.git
cd truststar
npm install
cp .env.example .env.local
# Add your GITHUB_TOKEN in .env.local
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token (scope: `public_repo`) |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL for badges (defaults to `http://localhost:3000`) |

## API

See [API Documentation](https://truststar.co/api-docs)

## Reliability

| Engine | Reliability | Test Size |
|--------|-------------|-----------|
| Trust Score | 100% | 29 repos |
| npm Check | 100% | 45 packages |
| Code Scan | 94% | 19 repos |

## License

MIT
