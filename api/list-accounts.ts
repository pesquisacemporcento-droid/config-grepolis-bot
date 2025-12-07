// Remove external import to ensure Edge function isolation stability
// import { RootConfig } from '../types';

export const config = {
  runtime: 'edge',
};

// Define minimal interface locally
interface ConfigFile {
  enabled?: boolean;
  farm?: {
    enabled: boolean;
    interval_min: number;
    interval_max: number;
  };
  updated_at?: string;
}

// Robust Base64 decode for Edge environment
function safeDecode(base64: string): string {
  try {
    const raw = atob(base64.replace(/[\n\r]/g, ''));
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn("Base64 decode failed", e);
    return "";
  }
}

export default async function handler(request: Request) {
  // Common headers for JSON response + CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0', // Prevent caching
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'pesquisacemporcento-droid';
  const repo = process.env.GITHUB_REPO || 'config-grepolis-bot';
  const path = process.env.GITHUB_PATH || 'config-grepolis-bot';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }), { status: 500, headers });
  }

  try {
    // 1. List files in the directory
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
        if (response.status === 404) {
             return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200, headers });
        }
        throw new Error(`GitHub API responded with ${response.status}`);
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
        return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200, headers });
    }

    // 2. Filter for config_*.json files
    const accountFiles = files.filter((f: any) => 
        f.name && f.name.startsWith('config_') && f.name.endsWith('.json')
    );

    const validAccounts = [];

    // 3. Sequential Fetch to prevent Rate Limiting / Edge Resource Exhaustion
    // (Promise.all can cause "ReadableStreamDefaultController" errors if too many requests fire at once in strict envs)
    for (const file of accountFiles) {
        try {
            const accountName = file.name.replace(/^config_/, '').replace(/\.json$/, '');
            
            const contentRes = await fetch(file.url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
            
            if (!contentRes.ok) continue;

            const fileData = await contentRes.json();
            if (!fileData.content) continue;
            
            const decodedContent = safeDecode(fileData.content);
            if (!decodedContent) continue;
            
            const json = JSON.parse(decodedContent) as ConfigFile;

            validAccounts.push({
                account: accountName,
                enabled: json.enabled ?? false,
                farmEnabled: json.farm?.enabled ?? false,
                intervalMin: json.farm?.interval_min ?? null,
                intervalMax: json.farm?.interval_max ?? null,
                updatedAt: json.updated_at ?? null,
                online: false, 
                lastSeen: null 
            });
        } catch (e) {
            console.error(`Error processing ${file.name}`, e);
            // Continue to next file on error
        }
    }

    return new Response(JSON.stringify({ ok: true, accounts: validAccounts }), { status: 200, headers });

  } catch (error: any) {
    console.error("List accounts fatal error:", error);
    // Return a clean 500 JSON
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Internal Error' }), { status: 500, headers });
  }
}