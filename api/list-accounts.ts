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

export default async function handler(request: Request) {
  // Common headers for JSON response + CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0', // Prevent caching of the account list
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
             // Repo or path might be empty or not exist yet
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

    // 3. Fetch content for each file to get status details (Parallel)
    const accountsData = await Promise.all(accountFiles.map(async (file: any) => {
        try {
            // Extract account name: config_br14_Nick.json -> br14_Nick
            const accountName = file.name.replace(/^config_/, '').replace(/\.json$/, '');
            
            // Fetch content using the API URL provided in the file object (Authenticated)
            const contentRes = await fetch(file.url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
            
            if (!contentRes.ok) {
                console.warn(`Failed to fetch content for ${file.name}: ${contentRes.status}`);
                return null;
            }

            const fileData = await contentRes.json();
            
            if (!fileData.content) return null;
            
            // Robust UTF-8 Decoding
            // 1. Decode Base64 to binary string (latin1)
            const rawContent = atob(fileData.content.replace(/\n/g, ''));
            // 2. Convert binary string to Uint8Array
            const bytes = Uint8Array.from(rawContent, c => c.charCodeAt(0));
            // 3. Decode UTF-8 bytes to string
            const decodedContent = new TextDecoder().decode(bytes);
            
            const json = JSON.parse(decodedContent) as ConfigFile;

            return {
                account: accountName,
                enabled: json.enabled ?? false,
                farmEnabled: json.farm?.enabled ?? false,
                intervalMin: json.farm?.interval_min ?? null,
                intervalMax: json.farm?.interval_max ?? null,
                updatedAt: json.updated_at ?? null,
                // Without a database, we cannot persist online state between requests.
                // Defaulting to false. A KV store (Vercel KV/Redis) is needed for this feature.
                online: false, 
                lastSeen: null 
            };
        } catch (e) {
            console.error(`Failed to parse config for ${file.name}`, e);
            return null;
        }
    }));

    // Filter out any failed fetches (nulls)
    const validAccounts = accountsData.filter(a => a !== null);

    return new Response(JSON.stringify({ ok: true, accounts: validAccounts }), { status: 200, headers });

  } catch (error: any) {
    console.error("List accounts error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers });
  }
}