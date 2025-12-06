export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'pesquisacemporcento-droid';
  const repo = process.env.GITHUB_REPO || 'config-grepolis-bot';
  let path = process.env.GITHUB_PATH || 'config-grepolis-bot/config.json';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }), { status: 500, headers });
  }

  try {
    const body = await request.json();
    const { config, account } = body;

    if (!config) {
      return new Response(JSON.stringify({ error: 'Missing config data' }), { status: 400, headers });
    }

    // Determine filename based on account
    if (account) {
      if (path.endsWith('.json')) {
        path = path.replace('.json', `_${account}.json`);
      } else {
        path = `${path}/config_${account}.json`;
      }
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // 1. Get current SHA to allow update (if file exists)
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
    } else if (getResponse.status !== 404) {
      throw new Error(`Error checking file existence: ${getResponse.status}`);
    }

    // 2. Add server-side timestamp
    const configToSave = {
      ...config,
      updated_at: new Date().toISOString()
    };

    // 3. Encode content
    const contentString = JSON.stringify(configToSave, null, 2);
    const bytes = new TextEncoder().encode(contentString);
    const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
    const contentBase64 = btoa(binString);

    // 4. PUT update/create
    const putBody = {
      message: account ? `Update config for ${account}` : 'Update global config',
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

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (error: any) {
    console.error("Save error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}