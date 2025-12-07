// Inline constants to avoid import issues in Edge Runtime
const DEFAULT_CONFIG = {
  enabled: true,
  farm_level: 'custom',
  farm: {
    enabled: true,
    interval_min: 600,
    interval_max: 637,
    shuffle_cities: true,
  },
  market: {
    enabled: false,
    target_town_id: "",
    send_wood: true,
    send_stone: true,
    send_silver: true,
    max_storage_percent: 80,
    max_send_per_trip: 5000,
    check_interval: 300,
    delay_between_trips: 120,
    split_equally: true,
  },
};

export const config = {
  runtime: 'edge',
};

// Robust Base64 decode helper
function safeDecode(base64: string): string {
  try {
    const raw = atob(base64.replace(/[\n\r]/g, ''));
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    // Try simple atob as fallback
    try {
        return atob(base64.replace(/[\n\r]/g, ''));
    } catch (e2) {
        return "";
    }
  }
}

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
    
    let decodedContent = safeDecode(data.content || '');
    if (!decodedContent) {
         throw new Error("Failed to decode file content");
    }

    let jsonConfig;
    try {
        jsonConfig = JSON.parse(decodedContent);
    } catch (e) {
        // Handle malformed JSON in file
        jsonConfig = {};
    }

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