/**
 * Cloudflare Worker — scheduled GitHub file creator
 *
 * Env vars (Secrets / Variables):
 *   GITHUB_TOKEN  — GitHub personal access token with contents:write
 *   GITHUB_REPO   — repository in "owner/repo" form, e.g. "octocat/hello-world"
 *
 * wrangler.toml should define a cron trigger, e.g.:
 *   [triggers]
 *   crons = ["0 * * * *"]
 */

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(createTimestampFile(env));
  },

  // Optional: allow manual trigger via HTTP for testing
  async fetch(request, env, ctx) {
    return new Response(
      "404",
      { status: 200 }
    );
  },
};

/**
 * Create a file on main whose name is the current Unix timestamp
 * and whose body is 20 random A–Z / a–z letters.
 */
async function createTimestampFile(env) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO; // "owner/repo"

  if (!token) throw new Error("Missing env GITHUB_TOKEN");
  if (!repo) throw new Error("Missing env GITHUB_REPO");
  if (!/^[^/]+\/[^/]+$/.test(repo)) {
    throw new Error('GITHUB_REPO must be in "owner/repo" form');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const path = String(timestamp);
  const content = randomLetters(20);

  // GitHub Contents API expects base64-encoded file body
  const body = {
    message: `chore: add timestamp file ${path}`,
    content: base64Encode(content),
    branch: "main",
  };

  const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "cloudflare-worker-github-file",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || res.statusText || `HTTP ${res.status}`;
    throw new Error(`GitHub API error: ${msg}`);
  }

  return {
    path,
    content,
    sha: data.content?.sha,
    html_url: data.content?.html_url,
  };
}

/** 20 random uppercase / lowercase English letters */
function randomLetters(length) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/** UTF-8 string → base64 (Workers-safe) */
function base64Encode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
