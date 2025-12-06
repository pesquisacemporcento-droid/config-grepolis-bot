// /api/save-config.ts
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER || 'pesquisacemporcento-droid';
  const repo   = process.env.GITHUB_REPO  || 'config-grepolis-bot';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const baseDir = (process.env.GITHUB_PATH || 'config-grepolis-bot').replace(/\/$/, '');

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }),
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { config: cfg, account } = body || {};

    const accountKey = (account || '').trim();

    if (!cfg) {
      return new Response(JSON.stringify({ error: 'Missing config data' }), { status: 400 });
    }

    if (!accountKey) {
      return new Response(JSON.stringify({ error: 'Missing account id' }), { status: 400 });
    }

    const path = `${baseDir}/config_${accountKey}.json`;
    const url  = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // 1. Verifica se o arquivo já existe para pegar o SHA
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
      // Se não for 404, é erro real
      throw new Error(`Error checking file existence: ${getResponse.status}`);
    }

    // 2. Monta config com updated_at
    const configToSave = {
      ...cfg,
      updated_at: new Date().toISOString(),
    };

    const contentString = JSON.stringify(configToSave, null, 2);
    const bytes = new TextEncoder().encode(contentString);
    const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
    const contentBase64 = btoa(binString);

    // 3. PUT update/create
    const putBody: any = {
      message: `Update config for ${accountKey}`,
      content: contentBase64,
      branch,
    };
    if (sha) putBody.sha = sha;

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
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 },
    );
  }
}
