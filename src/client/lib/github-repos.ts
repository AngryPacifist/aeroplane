import type { GitHubRepo } from "../api";

export function repoLastPushedAt(repo: GitHubRepo) {
  return repo.pushedAt || repo.updatedAt;
}

export function repoLastPushedTime(repo: GitHubRepo) {
  const time = new Date(repoLastPushedAt(repo)).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function compareReposByLastPush(left: GitHubRepo, right: GitHubRepo) {
  return repoLastPushedTime(right) - repoLastPushedTime(left);
}
