export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'pesquisacemporcento-droid';
  const repo = process.env.GITHUB_REPO || 'config-grepolis-bot';
  const path = process.env.GITHUB_PATH || 'config-grepolis-bot/config.json';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }), { status: 500 });
  }

  try {
    const { config } = await request.json();

    if (!config) {
      return new Response(JSON.stringify({ error: 'Missing config data' }), { status: 400 });
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // 1. Get current SHA to allow update
    const getResponse = await fetch(`${url}?ref=${branch}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let sha = '';
    if (getResponse.ok) {
      const data = await getResponse.json();
      sha = data.sha;
    }

    // 2. Encode content to Base64 with UTF-8 support
    const contentString = JSON.stringify(config, null, 2);
    // Standard JS way to encode UTF-8 string to Base64
    const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));

    // 3. PUT update
    const putBody = {
      message: 'Atualizar config.json pelo painel web',
      content: contentBase64,
      branch: branch,
      ...(sha ? { sha } : {}),
    };

    const putResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(putBody),
    });

    if (!putResponse.ok) {
      const errorData = await putResponse.json();
      throw new Error(errorData.message || `GitHub API error: ${putResponse.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Save error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}