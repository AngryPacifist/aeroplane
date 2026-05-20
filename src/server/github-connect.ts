import { config } from "./config.js";

type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
};

type GitHubBranch = {
  name: string;
};

type GitHubTreeEntry = {
  path: string;
  type: "blob" | "tree";
};

function requireGitHubToken() {
  if (!config.githubAccessToken) {
    throw new Error("GitHub is not connected. Set GITHUB_ACCESS_TOKEN on the server.");
  }
}

async function githubRequest<T>(path: string): Promise<T> {
  requireGitHubToken();

  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.githubAccessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "deploy-control-plane"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

function compareDirectories(a: string, b: string) {
  const depth = (value: string) => (value ? value.split("/").length : 0);
  return depth(a) - depth(b) || a.localeCompare(b);
}

export function repoUrlFromFullName(fullName: string) {
  return `https://github.com/${fullName}.git`;
}

export async function listConnectedRepos(query?: string) {
  const repos = await githubRequest<GitHubRepo[]>("/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member");
  const normalizedQuery = query?.trim().toLowerCase();

  return repos
    .filter((repo) => !normalizedQuery || repo.full_name.toLowerCase().includes(normalizedQuery) || repo.name.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    .map((repo) => ({
      id: String(repo.id),
      fullName: repo.full_name,
      name: repo.name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      cloneUrl: repoUrlFromFullName(repo.full_name)
    }));
}

export async function listRepoBranches(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  const branches = await githubRequest<GitHubBranch[]>(`/repos/${owner}/${repo}/branches?per_page=100`);
  return branches.map((branch) => branch.name);
}

export async function listRepoDirectories(repoFullName: string, branch: string) {
  const [owner, repo] = repoFullName.split("/");
  const branchInfo = await githubRequest<{ commit: { sha: string } }>(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
  const tree = await githubRequest<{ tree: GitHubTreeEntry[] }>(`/repos/${owner}/${repo}/git/trees/${branchInfo.commit.sha}?recursive=1`);

  const directories = new Set<string>([""]);
  for (const entry of tree.tree) {
    if (entry.type === "tree") {
      directories.add(entry.path);
      continue;
    }

    const parts = entry.path.split("/");
    parts.pop();
    if (parts.length > 0) {
      directories.add(parts.join("/"));
    }
  }

  return [...directories].sort(compareDirectories).map((path) => ({
    path,
    name: path ? path.split("/").at(-1) ?? path : "Repository root",
    depth: path ? path.split("/").length : 0
  }));
}

export function githubConnectionStatus() {
  return {
    connected: Boolean(config.githubAccessToken)
  };
}
