// /api/get-config.ts
import { DEFAULT_CONFIG } from '../types';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const urlObj = new URL(request.url);
  const accountParam = urlObj.searchParams.get('account') || '';
  const accountKey = accountParam.trim(); // ex: "br14_ANDE LUZ E MARIA"

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

  // Se tiver conta: config_<conta>.json, senão cai em config.json (legado)
  const path = accountKey
    ? `${baseDir}/config_${accountKey}.json`
    : `${baseDir}/config.json`;

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
        // Se não existir arquivo dessa conta, retorna DEFAULT_CONFIG
        return new Response(
          JSON.stringify({
            success: true,
            config: DEFAULT_CONFIG,
            isNew: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();

    // Decodifica conteúdo base64
    const rawContent = atob(data.content.replace(/\n/g, ''));
    const bytes = Uint8Array.from(rawContent, (c: string) => c.charCodeAt(0));
    const decodedContent = new TextDecoder().decode(bytes);

    const jsonConfig = JSON.parse(decodedContent);

    // Merge com DEFAULT_CONFIG para garantir todas as chaves
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...jsonConfig,
      farm:   { ...DEFAULT_CONFIG.farm,   ...(jsonConfig.farm   || {}) },
      market: { ...DEFAULT_CONFIG.market, ...(jsonConfig.market || {}) },
    };

    return new Response(
      JSON.stringify({ success: true, config: finalConfig }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 },
    );
  }
}
