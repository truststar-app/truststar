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

export type TrustLabel = "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "NEW";

export type TrustScore = {
  repo: string;
  owner: string;
  score: number;
  label: TrustLabel;
  dimensions: {
    accounts: number;
    temporal: number;
    health: number;
  };
  signals: {
    newAccountsRatio: number;
    noRepoRatio: number;
    noFollowersRatio: number;
    noAvatarRatio: number;
    lockstepScore: number;
    zScorePeak: number;
    velocityScore: number;
    recentStarsRatio: number;
    forkStarRatio: number;
    activeContributorsRatio: number;
    commitFrequency: number;
    issueResolutionRatio: number;
  };
  analyzedAt: string;
  sampleSize: number;
};

export type ApiError = {
  error: string;
  details?: string;
};
