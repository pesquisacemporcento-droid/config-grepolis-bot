import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const repoOwner = process.env.GITHUB_OWNER;
const repoName  = process.env.GITHUB_REPO;
const filePath  = process.env.GITHUB_PATH;
const token     = process.env.GITHUB_TOKEN;

const octokit = new Octokit({
  auth: token,
});

type OnlineStore = {
  [account: string]: {
    [clientId: string]: {
      last_seen: string; // ISO
    };
  };
};

const ONLINE_FILE = (filePath ? filePath.replace(/\/$/, '') + '/' : '') + 'online-accounts.json';

// Lê o arquivo online-accounts.json ou retorna objeto vazio
async function loadOnlineStore(): Promise<{ store: OnlineStore; sha: string | null }> {
  try {
    const getFile = await octokit.repos.getContent({
      owner: repoOwner!,
      repo: repoName!,
      path: ONLINE_FILE,
    });

    if (!('content' in getFile.data)) {
      return { store: {}, sha: null };
    }

    const buff = Buffer.from(getFile.data.content, 'base64');
    const json = buff.toString('utf8') || '{}';
    const store = JSON.parse(json) as OnlineStore;

    return { store, sha: (getFile.data as any).sha || null };
  } catch (err: any) {
    // Se 404, arquivo ainda não existe
    if (err?.status === 404) {
      return { store: {}, sha: null };
    }
    throw err;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    if (!repoOwner || !repoName || !filePath || !token) {
      return res.status(500).json({ ok: false, error: 'Missing GitHub env vars' });
    }

    const { account, clientId } = req.body || {};

    if (!account || !clientId) {
      return res.status(400).json({ ok: false, error: 'Missing account or clientId' });
    }

    const nowIso = new Date().toISOString();

    const { store, sha } = await loadOnlineStore();

    if (!store[account]) {
      store[account] = {};
    }
    store[account][clientId] = { last_seen: nowIso };

    const newContent = Buffer.from(JSON.stringify(store, null, 2), 'utf8').toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner!,
      repo: repoName!,
      path: ONLINE_FILE,
      message: `Update online-accounts for ${account}`,
      content: newContent,
      sha: sha || undefined,
    });

    return res.status(200).json({ ok: true, now: nowIso });
  } catch (err: any) {
    console.error('Heartbeat error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Heartbeat failed' });
  }
}
