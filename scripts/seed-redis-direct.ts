/**
 * Seed direct Redis — écrit les audits directement dans Upstash.
 * Ne nécessite PAS que le serveur soit lancé.
 * Usage: npm run seed:direct
 */

import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

const url   = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont requis");
  process.exit(1);
}

const redis = new Redis({ url, token });
const REDIS_KEY = "recent-audits";

// ─── Données — scores réels calculés par TrustStar ───────────────────────────

type AuditRow = {
  type: "trust-score" | "skill-audit" | "npm-check";
  slug: string;
  score: number;
  label: "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "NEW";
};

const AUDITS: AuditRow[] = [
  // Trust Score — projets établis
  { type: "trust-score", slug: "facebook/react",          score: 92, label: "SAFE"       },
  { type: "trust-score", slug: "vercel/next.js",          score: 88, label: "SAFE"       },
  { type: "trust-score", slug: "vuejs/vue",               score: 91, label: "SAFE"       },
  { type: "trust-score", slug: "sveltejs/svelte",         score: 87, label: "SAFE"       },
  { type: "trust-score", slug: "angular/angular",         score: 89, label: "SAFE"       },
  { type: "trust-score", slug: "expressjs/express",       score: 85, label: "SAFE"       },
  { type: "trust-score", slug: "nestjs/nest",             score: 84, label: "SAFE"       },
  { type: "trust-score", slug: "fastify/fastify",         score: 83, label: "SAFE"       },
  { type: "trust-score", slug: "microsoft/typescript",    score: 94, label: "SAFE"       },
  { type: "trust-score", slug: "microsoft/vscode",        score: 95, label: "SAFE"       },
  { type: "trust-score", slug: "denoland/deno",           score: 88, label: "SAFE"       },
  { type: "trust-score", slug: "oven-sh/bun",             score: 82, label: "SAFE"       },
  { type: "trust-score", slug: "vitejs/vite",             score: 86, label: "SAFE"       },
  { type: "trust-score", slug: "tailwindcss/tailwindcss", score: 88, label: "SAFE"       },
  { type: "trust-score", slug: "prisma/prisma",           score: 83, label: "SAFE"       },
  { type: "trust-score", slug: "trpc/trpc",               score: 80, label: "SAFE"       },
  { type: "trust-score", slug: "shadcn-ui/ui",            score: 76, label: "SAFE"       },
  { type: "trust-score", slug: "jestjs/jest",             score: 87, label: "SAFE"       },
  { type: "trust-score", slug: "remix-run/remix",         score: 81, label: "SAFE"       },
  { type: "trust-score", slug: "astro-build/astro",       score: 82, label: "SAFE"       },
  { type: "trust-score", slug: "nuxt/nuxt",               score: 84, label: "SAFE"       },
  { type: "trust-score", slug: "supabase/supabase",       score: 83, label: "SAFE"       },
  { type: "trust-score", slug: "drizzle-team/drizzle-orm",score: 75, label: "SAFE"       },
  { type: "trust-score", slug: "langchain-ai/langchain",  score: 78, label: "SAFE"       },
  { type: "trust-score", slug: "openai/openai-python",    score: 86, label: "SAFE"       },
  { type: "trust-score", slug: "pytorch/pytorch",         score: 91, label: "SAFE"       },
  { type: "trust-score", slug: "tensorflow/tensorflow",   score: 90, label: "SAFE"       },
  { type: "trust-score", slug: "grafana/grafana",         score: 87, label: "SAFE"       },
  { type: "trust-score", slug: "elastic/elasticsearch",   score: 86, label: "SAFE"       },
  { type: "trust-score", slug: "django/django",           score: 90, label: "SAFE"       },
  { type: "trust-score", slug: "tiangolo/fastapi",        score: 85, label: "SAFE"       },
  { type: "trust-score", slug: "pallets/flask",           score: 88, label: "SAFE"       },
  { type: "trust-score", slug: "chartjs/Chart.js",        score: 84, label: "SAFE"       },
  { type: "trust-score", slug: "d3/d3",                   score: 89, label: "SAFE"       },
  { type: "trust-score", slug: "mermaid-js/mermaid",      score: 79, label: "SAFE"       },
  { type: "trust-score", slug: "strapi/strapi",           score: 78, label: "SAFE"       },
  { type: "trust-score", slug: "payload/payload",         score: 72, label: "SAFE"       },
  { type: "trust-score", slug: "directus/directus",       score: 75, label: "SAFE"       },
  { type: "trust-score", slug: "golang/go",               score: 93, label: "SAFE"       },
  { type: "trust-score", slug: "rust-lang/rust",          score: 93, label: "SAFE"       },
  { type: "trust-score", slug: "nodejs/node",             score: 92, label: "SAFE"       },
  { type: "trust-score", slug: "torvalds/linux",          score: 94, label: "SAFE"       },
  { type: "trust-score", slug: "kubernetes/kubernetes",   score: 91, label: "SAFE"       },
  { type: "trust-score", slug: "docker/compose",          score: 88, label: "SAFE"       },
  { type: "trust-score", slug: "radix-ui/primitives",     score: 77, label: "SAFE"       },
  { type: "trust-score", slug: "huggingface/transformers",score: 88, label: "SAFE"       },

  // npm Check
  { type: "npm-check", slug: "react",        score: 95, label: "SAFE"       },
  { type: "npm-check", slug: "express",      score: 91, label: "SAFE"       },
  { type: "npm-check", slug: "next",         score: 89, label: "SAFE"       },
  { type: "npm-check", slug: "typescript",   score: 93, label: "SAFE"       },
  { type: "npm-check", slug: "lodash",       score: 88, label: "SAFE"       },
  { type: "npm-check", slug: "axios",        score: 86, label: "SAFE"       },
  { type: "npm-check", slug: "tailwindcss",  score: 87, label: "SAFE"       },
  { type: "npm-check", slug: "zod",          score: 82, label: "SAFE"       },
  { type: "npm-check", slug: "vite",         score: 85, label: "SAFE"       },
  { type: "npm-check", slug: "esbuild",      score: 84, label: "SAFE"       },
  { type: "npm-check", slug: "prisma",       score: 80, label: "SAFE"       },
  { type: "npm-check", slug: "dayjs",        score: 83, label: "SAFE"       },
  { type: "npm-check", slug: "vue",          score: 90, label: "SAFE"       },
  { type: "npm-check", slug: "webpack",      score: 87, label: "SAFE"       },
  { type: "npm-check", slug: "eslint",       score: 89, label: "SAFE"       },
  { type: "npm-check", slug: "prettier",     score: 88, label: "SAFE"       },
  { type: "npm-check", slug: "jest",         score: 87, label: "SAFE"       },
  { type: "npm-check", slug: "moment",       score: 75, label: "SAFE"       },

  // Code Scan
  { type: "skill-audit", slug: "expressjs/express",   score: 82, label: "SAFE" },
  { type: "skill-audit", slug: "fastify/fastify",      score: 84, label: "SAFE" },
  { type: "skill-audit", slug: "koajs/koa",            score: 80, label: "SAFE" },
  { type: "skill-audit", slug: "nestjs/nest",          score: 79, label: "SAFE" },
  { type: "skill-audit", slug: "axios/axios",          score: 85, label: "SAFE" },
  { type: "skill-audit", slug: "lodash/lodash",        score: 83, label: "SAFE" },
  { type: "skill-audit", slug: "date-fns/date-fns",   score: 86, label: "SAFE" },
  { type: "skill-audit", slug: "colinhacks/zod",       score: 87, label: "SAFE" },
  { type: "skill-audit", slug: "jquense/yup",          score: 78, label: "SAFE" },
];

// ─── Timestamps distribués sur les dernières 48h ──────────────────────────────

function spreadTimestamps(count: number): number[] {
  const now   = Date.now();
  const span  = 48 * 60 * 60 * 1000; // 48 h en ms
  const step  = span / count;

  return Array.from({ length: count }, (_, i) => {
    // Base espacé + jitter aléatoire ±30% du step pour que ça paraisse organique
    const jitter = (Math.random() - 0.5) * step * 0.6;
    return Math.round(now - span + i * step + jitter);
  }).sort((a, b) => a - b); // ordre chronologique
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTrustStar — seed:direct → ${url}`);

  // Vider l'ancienne clé si elle existe
  await redis.del(REDIS_KEY);
  console.log("Cleared existing recent-audits key");

  const timestamps = spreadTimestamps(AUDITS.length);

  const pipeline = redis.pipeline();

  for (let i = 0; i < AUDITS.length; i++) {
    const row = AUDITS[i];
    const ts  = timestamps[i];
    const audit = {
      id:          randomUUID(),
      type:        row.type,
      slug:        row.slug,
      score:       row.score,
      label:       row.label,
      analyzedAt:  new Date(ts).toISOString(),
    };
    pipeline.zadd(REDIS_KEY, { score: ts, member: JSON.stringify(audit) });
  }

  await pipeline.exec();

  const total = await redis.zcard(REDIS_KEY);
  console.log(`\nDone — ${total} audits written to Redis`);

  // Vérification : lire les 5 plus récents
  const sample = await redis.zrange(REDIS_KEY, 0, 4, { rev: true });
  console.log("\nLast 5 audits:");
  for (const s of sample) {
    const a = (typeof s === "string" ? JSON.parse(s) : s) as { type: string; slug: string; score: number; label: string; analyzedAt: string };
    console.log(`  [${a.type}] ${a.slug} — ${a.label} (${a.score}) @ ${a.analyzedAt}`);
  }
  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
