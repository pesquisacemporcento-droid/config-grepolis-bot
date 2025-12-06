import { DEFAULT_CONFIG } from '../types';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const urlObj = new URL(request.url);
  const accountKey = urlObj.searchParams.get('account');

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'pesquisacemporcento-droid';
  const repo = process.env.GITHUB_REPO || 'config-grepolis-bot';
  let path = process.env.GITHUB_PATH || 'config-grepolis-bot/config.json';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }), { status: 500, headers });
  }

  // Determine filename based on account
  if (accountKey) {
    if (path.endsWith('.json')) {
      path = path.replace('.json', `_${accountKey}.json`);
    } else {
      path = `${path}/config_${accountKey}.json`;
    }
  }

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return default config for new accounts
        return new Response(JSON.stringify({ success: true, config: DEFAULT_CONFIG, isNew: true }), { status: 200, headers });
      }
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Robust UTF-8 Decoding
    const rawContent = atob(data.content.replace(/\n/g, ''));
    const bytes = Uint8Array.from(rawContent, c => c.charCodeAt(0));
    const decodedContent = new TextDecoder().decode(bytes);
    
    const jsonConfig = JSON.parse(decodedContent);

    // Merge with DEFAULT_CONFIG
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...jsonConfig,
      farm: { ...DEFAULT_CONFIG.farm, ...(jsonConfig.farm || {}) },
      market: { ...DEFAULT_CONFIG.market, ...(jsonConfig.market || {}) }
    };

    return new Response(JSON.stringify({ success: true, config: finalConfig }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
  }
}