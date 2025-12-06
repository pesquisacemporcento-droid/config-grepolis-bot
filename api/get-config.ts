import { DEFAULT_CONFIG } from '../types';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const urlObj = new URL(request.url);
  const accountKey = urlObj.searchParams.get('account');

  // If no account is provided, we can either return an error or the "global" config.
  // Based on the new requirement, we should prioritize account-based configs.
  // We'll use a specific filename format: config_<accountKey>.json
  
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'pesquisacemporcento-droid';
  const repo = process.env.GITHUB_REPO || 'config-grepolis-bot';
  // Base path usually: config-grepolis-bot/config.json
  let path = process.env.GITHUB_PATH || 'config-grepolis-bot/config.json';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }), { status: 500 });
  }

  // Determine filename based on account
  if (accountKey) {
    // Replace 'config.json' with 'config_<account>.json' or append if path is just a directory
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
        // IMPORTANT: If file doesn't exist for this account, return DEFAULT CONFIG
        // This allows the frontend to start fresh without errors.
        return new Response(JSON.stringify({ success: true, config: DEFAULT_CONFIG, isNew: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    
    // Decode Content
    const rawContent = atob(data.content.replace(/\n/g, ''));
    const bytes = Uint8Array.from(rawContent, c => c.charCodeAt(0));
    const decodedContent = new TextDecoder().decode(bytes);
    
    const jsonConfig = JSON.parse(decodedContent);

    // Merge with DEFAULT_CONFIG to ensure all keys exist (schema migration)
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...jsonConfig,
      farm: { ...DEFAULT_CONFIG.farm, ...(jsonConfig.farm || {}) },
      market: { ...DEFAULT_CONFIG.market, ...(jsonConfig.market || {}) }
    };

    return new Response(JSON.stringify({ success: true, config: finalConfig }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}