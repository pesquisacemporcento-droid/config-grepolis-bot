export const config = {
  runtime: "edge",
};

type GitHubFileResponse = {
  content?: string;
  encoding?: string;
  sha?: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = process.env.GITHUB_PATH;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo || !path) {
    return jsonResponse(
      { success: false, error: "Missing GitHub environment variables" },
      500
    );
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}?ref=${branch}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return jsonResponse(
        {
          success: false,
          error: `GitHub GET error: ${res.status}`,
          details: text,
        },
        res.status
      );
    }

    const data = (await res.json()) as GitHubFileResponse;

    if (!data.content) {
      return jsonResponse(
        { success: false, error: "No content in GitHub response" },
        500
      );
    }

    // conteúdo vem em base64
    const base64 = data.content.replace(/\n/g, "");
    const jsonString = atob(base64);
    const configObj = JSON.parse(jsonString);

    return jsonResponse({ success: true, config: configObj }, 200);
  } catch (e: any) {
    return jsonResponse(
      {
        success: false,
        error: "Unexpected error while reading config from GitHub",
        details: String(e),
      },
      500
    );
  }
}
