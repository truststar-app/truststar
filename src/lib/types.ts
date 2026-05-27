export type GitHubUser = {
  login: string;
  id: number;
  avatar_url: string;
  starred_at: string;
};

export type GitHubUserDetail = {
  login: string;
  id: number;
  avatar_url: string;
  created_at: string;
  public_repos: number;
  followers: number;
  following: number;
  starred_at: string;
};

export type RepoInfo = {
  name: string;
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  description: string | null;
  language: string | null;
};

export type CommitActivity = {
  week: number;
  total: number;
  days: number[];
};

export type ContributorStat = {
  author: {
    login: string;
    id: number;
    avatar_url: string;
  };
  total: number;
  weeks: {
    w: number;
    a: number;
    d: number;
    c: number;
  }[];
};

export type IssueStats = {
  open: number;
  closed: number;
};

export type TrustLabel = "SAFE" | "CAUTION" | "SUSPICIOUS" | "DANGEROUS" | "NEW";

export type TrustScore = {
  repo: string;
  owner: string;
  score: number;
  label: TrustLabel;
  dimensions: {
    accounts: number;
    temporal: number;
    health: number;
    authenticity?: number;  // StarScout-inspired; optional for backward compat with cached results
  };
  signals: {
    // Account Quality
    newAccountsRatio: number;
    noRepoRatio: number;
    noFollowersRatio: number;
    noAvatarRatio: number;
    lockstepScore: number;
    // Temporal Behavior
    zScorePeak: number;
    velocityScore: number;
    recentStarsRatio: number;
    // Project Health
    forkStarRatio: number;
    activeContributorsRatio: number;
    commitFrequency: number;
    issueResolutionRatio: number;
    // Authenticity (StarScout-inspired, optional)
    lowActivityRatio?: number;
    coordLockstepScore?: number;
    burstLowActivityRatio?: number;
    ghostAccountsRatio?: number;
  };
  labelOverrideReason?: string;
  analyzedAt: string;
  sampleSize: number;
  samplingMethod?: "stratified" | "default";
  burstMonthDetected?: string;
  burstGroupSize?: number;
  baselineGroupSize?: number;
};

export type ApiError = {
  error: string;
  details?: string;
};
