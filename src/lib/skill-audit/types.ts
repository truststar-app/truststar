export type SkillSafetyScore = {
  slug: string
  repoUrl: string
  score: number
  label: "SAFE" | "SUSPICIOUS" | "DANGEROUS"
  dimensions: {
    popularity: number
    permissions: number
    codeSafety: number
    ecosystem: number
  }
  findings: SkillFinding[]
  metadata: SkillMetadata
  analyzedAt: string
}

export type SkillFinding = {
  id: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  category: "network" | "filesystem" | "execution" | "obfuscation" | "permissions" | "dependencies"
  title: string
  description: string
  file: string
  line?: number
  evidence: string
  recommendation: string
}

export type SkillMetadata = {
  name: string
  description: string
  author: string
  authorAccountAge?: number
  authorPublicRepos?: number
  files: string[]
  hasSkillMd: boolean
  hasInstallerScript: boolean
  hasBashScripts: boolean
  hasPythonScripts: boolean
  hasNodeScripts: boolean
  totalLinesOfCode: number
  lastCommitDate: string
  stars: number
  forks: number
}

export type SkillFile = {
  path: string
  content: string
  size: number
}

export type FetchedSkillData = {
  owner: string
  repo: string
  repoUrl: string
  files: SkillFile[]
  metadata: SkillMetadata
  repoInfo: {
    stars: number
    forks: number
    created_at: string
    pushed_at: string
    description: string | null
    default_branch: string
  }
  authorInfo: {
    login: string
    created_at: string
    public_repos: number
  }
}
