/**
 * Seed script — pre-populate Recent Audits feed with real analyses.
 * Usage: npm run seed
 * Requires the dev server to be running on http://localhost:3000
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const DELAY_MS = 3000; // 3 s between calls — avoids GitHub rate-limit

// ─── Lists ──────────────────────────────────────────────────────────────────

const TRUST_SCORE_REPOS = [
  "facebook/react",
  "vercel/next.js",
  "vuejs/vue",
  "sveltejs/svelte",
  "angular/angular",
  "expressjs/express",
  "nestjs/nest",
  "fastify/fastify",
  "trpc/trpc",
  "prisma/prisma",
  "tailwindcss/tailwindcss",
  "shadcn-ui/ui",
  "radix-ui/primitives",
  "microsoft/typescript",
  "microsoft/vscode",
  "denoland/deno",
  "oven-sh/bun",
  "nodejs/node",
  "rust-lang/rust",
  "golang/go",
  "langchain-ai/langchain",
  "huggingface/transformers",
  "openai/openai-python",
  "supabase/supabase",
  "drizzle-team/drizzle-orm",
  "jestjs/jest",
  "vitejs/vite",
  "remix-run/remix",
  "astro-build/astro",
  "nuxt/nuxt",
  "docker/compose",
  "kubernetes/kubernetes",
  "grafana/grafana",
  "torvalds/linux",
  "git/git",
  "curl/curl",
  "django/django",
  "pallets/flask",
  "tiangolo/fastapi",
  "pytorch/pytorch",
  "tensorflow/tensorflow",
  "elastic/elasticsearch",
  "redis/redis",
  "postgres/postgres",
  "strapi/strapi",
  "directus/directus",
  "payload/payload",
  "chartjs/Chart.js",
  "mermaid-js/mermaid",
  "d3/d3",
];

const NPM_PACKAGES = [
  "express",
  "react",
  "next",
  "vue",
  "axios",
  "lodash",
  "moment",
  "dayjs",
  "typescript",
  "tailwindcss",
  "prisma",
  "zod",
  "esbuild",
  "webpack",
];

const SKILL_AUDIT_REPOS = [
  "expressjs/express",
  "fastify/fastify",
  "koajs/koa",
  "nestjs/nest",
  "axios/axios",
  "lodash/lodash",
  "date-fns/date-fns",
  "colinhacks/zod",
  "jquense/yup",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fmtLabel(label: string, score: number): string {
  return `${label} (${score})`;
}

// ─── API callers ─────────────────────────────────────────────────────────────

async function analyzeTrustScore(
  slug: string
): Promise<{ score: number; label: string } | null> {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: slug }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { score: number; label: string };
  return data;
}

async function analyzeNpm(
  pkg: string
): Promise<{ score?: number; label?: string } | null> {
  const res = await fetch(`${BASE_URL}/api/npm-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ package: pkg }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { score?: number; label?: string };
  return data;
}

async function analyzeSkill(
  slug: string
): Promise<{ score: number; label: string } | null> {
  const res = await fetch(`${BASE_URL}/api/skill-audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl: slug }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { score: number; label: string };
  return data;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

interface Task {
  label: string;
  run: () => Promise<{ score: number; label: string } | null>;
}

function buildTasks(): Task[] {
  const tasks: Task[] = [];

  for (const slug of TRUST_SCORE_REPOS) {
    tasks.push({
      label: `[trust-score] ${slug}`,
      run: () => analyzeTrustScore(slug),
    });
  }

  for (const pkg of NPM_PACKAGES) {
    tasks.push({
      label: `[npm-check]   ${pkg}`,
      run: async () => {
        const data = await analyzeNpm(pkg);
        if (!data) return null;
        return { score: data.score ?? 0, label: data.label ?? "SAFE" };
      },
    });
  }

  for (const slug of SKILL_AUDIT_REPOS) {
    tasks.push({
      label: `[skill-audit] ${slug}`,
      run: () => analyzeSkill(slug),
    });
  }

  return tasks;
}

async function main() {
  console.log(`\nTrustStar — seed-audits`);
  console.log(`Target : ${BASE_URL}`);
  console.log(`Tasks  : ${TRUST_SCORE_REPOS.length} trust-score + ${NPM_PACKAGES.length} npm-check + ${SKILL_AUDIT_REPOS.length} skill-audit`);
  console.log(`Delay  : ${DELAY_MS / 1000}s between calls\n`);

  const tasks = buildTasks();
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const n = `[${i + 1}/${tasks.length}]`;

    try {
      const result = await task.run();
      if (!result) {
        console.log(`${n} ${task.label} — [SKIP] no result`);
        fail++;
      } else {
        console.log(`${n} ${task.label} — [OK] ${fmtLabel(result.label, result.score)}`);
        ok++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${n} ${task.label} — [FAIL] ${msg}`);
      fail++;
    }

    if (i < tasks.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n── Summary ─────────────────────────────`);
  console.log(`  OK   : ${ok}`);
  console.log(`  FAIL : ${fail}`);
  console.log(`  Total: ${tasks.length}`);
  console.log(`────────────────────────────────────────\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
