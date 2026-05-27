import { githubFetch } from "./client";

type GitHubEvent = {
  type: string;
  repo: { name: string };
  created_at: string;
};

export type UserEventData = {
  eventTypes: string[];
  recentStars: { repo: string; starredAt: number }[];
};

export async function fetchUserEventData(login: string): Promise<UserEventData> {
  try {
    const events = await githubFetch<GitHubEvent[]>(
      `/users/${login}/events?per_page=30`
    );
    return {
      eventTypes: events.map((e) => e.type),
      recentStars: events
        .filter((e) => e.type === "WatchEvent")
        .map((e) => ({ repo: e.repo.name, starredAt: new Date(e.created_at).getTime() })),
    };
  } catch {
    return { eventTypes: [], recentStars: [] };
  }
}
