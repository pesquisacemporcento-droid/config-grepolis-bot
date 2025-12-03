export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
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
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(JSON.stringify({ success: false, error: 'File not found' }), { status: 404 });
      }
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // GitHub returns content in base64
    // We use decodeURIComponent(escape(atob(...))) to correctly handle UTF-8 characters (accents, emojis)
    const rawContent = atob(data.content.replace(/\n/g, ''));
    const decodedContent = decodeURIComponent(escape(rawContent));
    
    const jsonConfig = JSON.parse(decodedContent);

    return new Response(JSON.stringify({ success: true, config: jsonConfig }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}