// Remove external import to ensure Edge function isolation stability
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

// Robust Base64 decode for Edge environment with fallback
function safeDecode(base64: string): string {
  if (!base64) return "";
  try {
    const raw = atob(base64.replace(/[\n\r]/g, ''));
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    try {
        return atob(base64.replace(/[\n\r]/g, ''));
    } catch (e2) {
        return "";
    }
  }
}

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(request: Request) {
  // Common headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0',
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

    const validAccounts: any[] = [];

    // 3. Batched Concurrent Fetch
    const BATCH_SIZE = 4;
    
    for (let i = 0; i < accountFiles.length; i += BATCH_SIZE) {
        const batch = accountFiles.slice(i, i + BATCH_SIZE);
        
        if (i > 0) await delay(100);

        await Promise.all(batch.map(async (file: any) => {
            try {
                const accountName = file.name.replace(/^config_/, '').replace(/\.json$/, '');
                
                const contentRes = await fetch(file.url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                    },
                });
                
                if (!contentRes.ok) return;

                const fileData = await contentRes.json();
                if (!fileData.content) return;
                
                const decodedContent = safeDecode(fileData.content);
                if (!decodedContent) return;
                
                // CRITICAL FIX: Robust JSON extraction
                // This prevents "Unexpected non-whitespace character after JSON at position 4"
                // by finding the first '{' and the last '}' and ignoring everything else.
                const firstBrace = decodedContent.indexOf('{');
                const lastBrace = decodedContent.lastIndexOf('}');
                
                if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
                    return; // Not a valid JSON object
                }

                const cleanJsonString = decodedContent.substring(firstBrace, lastBrace + 1);

                let json: ConfigFile;
                try {
                    json = JSON.parse(cleanJsonString);
                } catch (jsonErr) {
                    console.error(`Invalid JSON in ${file.name}`);
                    return;
                }

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
                // Silently fail for individual files to keep the list alive
            }
        }));
    }

    // Sort alphabetically by account name
    validAccounts.sort((a, b) => a.account.localeCompare(b.account));

    return new Response(JSON.stringify({ ok: true, accounts: validAccounts }), { status: 200, headers });

  } catch (error: any) {
    console.error("List accounts fatal error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Internal Error' }), { status: 500, headers });
  }
}