// Remove external import to ensure Edge function isolation stability
export const config = {
  runtime: 'edge',
};

// Robust Base64 decode for Edge environment with fallback
function safeDecode(base64: string): string {
  if (!base64) return "";
  try {
    const clean = base64.replace(/\s/g, '');
    const raw = atob(clean);
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return "";
  }
}

export default async function handler(request: Request) {
  // Always return a valid JSON response from the very top level
  try {
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
    let path = process.env.GITHUB_PATH || 'config-grepolis-bot';
    const branch = process.env.GITHUB_BRANCH || 'main';

    // Ensure path is treated as a directory
    if (path.endsWith('.json')) {
        const parts = path.split('/');
        parts.pop(); 
        path = parts.join('/');
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }), { status: 500, headers });
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
        // If GitHub returns 404 (repo empty or path wrong), treat as empty list rather than error
        if (response.status === 404) {
             return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200, headers });
        }
        return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200, headers });
    }

    let files;
    try {
        files = await response.json();
    } catch (e) {
        return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200, headers });
    }

    if (!Array.isArray(files)) {
        return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200, headers });
    }

    const accountFiles = files.filter((f: any) => 
        f.name && f.name.startsWith('config_') && f.name.endsWith('.json')
    );

    const validAccounts: any[] = [];

    // Process files sequentially to ensure stability
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

            let fileData;
            try {
                fileData = await contentRes.json();
            } catch (e) { continue; }

            if (!fileData.content) continue;
            
            const decodedContent = safeDecode(fileData.content);
            if (!decodedContent) continue;
            
            // Extract JSON substring carefully
            const firstBrace = decodedContent.indexOf('{');
            const lastBrace = decodedContent.lastIndexOf('}');
            
            if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
                continue; 
            }

            const cleanJsonString = decodedContent.substring(firstBrace, lastBrace + 1);

            let json: any;
            try {
                json = JSON.parse(cleanJsonString);
            } catch (jsonErr) {
                continue;
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
            // Ignore single file failures
        }
    }

    validAccounts.sort((a, b) => a.account.localeCompare(b.account));

    return new Response(JSON.stringify({ ok: true, accounts: validAccounts }), { status: 200, headers });

  } catch (error) {
    // Final fallback
    return new Response(JSON.stringify({ ok: false, error: 'Internal Error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });
  }
}