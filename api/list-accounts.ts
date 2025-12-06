import { RootConfig } from '../types';

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
  const path = process.env.GITHUB_PATH || 'config-grepolis-bot'; // Directory path
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing GITHUB_TOKEN' }), { status: 500 });
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
             return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200 });
        }
        throw new Error(`GitHub API responded with ${response.status}`);
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
        return new Response(JSON.stringify({ ok: true, accounts: [] }), { status: 200 });
    }

    // 2. Filter for config_*.json files
    const accountFiles = files.filter((f: any) => 
        f.name.startsWith('config_') && f.name.endsWith('.json')
    );

    // 3. Fetch content for each file to get status details (Parallel)
    // We use file.url (API) instead of download_url (Raw) to ensure authentication headers work correctly for private repos.
    const accountsData = await Promise.all(accountFiles.map(async (file: any) => {
        try {
            // Extract account name: config_br14_Nick.json -> br14_Nick
            const accountName = file.name.replace(/^config_/, '').replace(/\.json$/, '');
            
            // Fetch content using the API URL provided in the file object
            const contentRes = await fetch(file.url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
            
            if (!contentRes.ok) {
                // If specific file fetch fails, just skip it
                console.warn(`Failed to fetch content for ${file.name}: ${contentRes.status}`);
                return null;
            }

            const fileData = await contentRes.json();
            
            // GitHub API returns content in base64, possibly with newlines
            if (!fileData.content) return null;
            
            const rawContent = atob(fileData.content.replace(/\n/g, ''));
            const json: RootConfig = JSON.parse(rawContent);

            return {
                account: accountName,
                enabled: json.enabled ?? false,
                farmEnabled: json.farm?.enabled ?? false,
                intervalMin: json.farm?.interval_min ?? null,
                intervalMax: json.farm?.interval_max ?? null,
                updatedAt: json.updated_at ?? null
            };
        } catch (e) {
            console.error(`Failed to parse config for ${file.name}`, e);
            return null;
        }
    }));

    // Filter out any failed fetches (nulls)
    const validAccounts = accountsData.filter(a => a !== null);

    return new Response(JSON.stringify({ ok: true, accounts: validAccounts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("List accounts error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
}