import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const repoOwner = process.env.GITHUB_OWNER;
const repoName  = process.env.GITHUB_REPO;
const filePath  = process.env.GITHUB_PATH;
const token     = process.env.GITHUB_TOKEN;

const octokit = new Octokit({
  auth: token,
});

type FarmConfig = {
  enabled: boolean;
  interval_min: number;
  interval_max: number;
  shuffle_cities: boolean;
};

type MarketConfig = {
  enabled: boolean;
  target_town_id: string;
  send_wood: boolean;
  send_stone: boolean;
  send_silver: boolean;
  max_storage_percent: number;
  max_send_per_trip: number;
  check_interval: number;
  delay_between_trips: number;
  split_equally: boolean;
};

type RootConfig = {
  enabled: boolean;
  farm_level: string;
  farm: FarmConfig;
  market: MarketConfig;
  updated_at?: string;
};

type OnlineStore = {
  [account: string]: {
    [clientId: string]: {
      last_seen: string;
    };
  };
};

// pasta base dos configs, ex: "config-grepolis-bot"
const BASE_DIR = (filePath || '').replace(/\/$/, '');
const ONLINE_FILE = (filePath ? filePath.replace(/\/$/, '') + '/' : '') + 'online-accounts.json';

async function loadOnlineStore(): Promise<OnlineStore> {
  if (!repoOwner || !repoName || !filePath || !token) return {};

  try {
    const res = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: ONLINE_FILE,
    });

    if (!('content' in res.data)) return {};
    const buff = Buffer.from(res.data.content, 'base64');
    const json = buff.toString('utf8') || '{}';
    return JSON.parse(json) as OnlineStore;
  } catch (err: any) {
    if (err?.status === 404) return {};
    throw err;
  }
}

// Lê um arquivo config_<conta>.json e devolve o RootConfig
async function loadAccountConfig(path: string): Promise<RootConfig | null> {
  try {
    const res = await octokit.repos.getContent({
      owner: repoOwner!,
      repo: repoName!,
      path,
    });

    if (!('content' in res.data)) return null;
    const buff = Buffer.from(res.data.content, 'base64');
    const json = buff.toString('utf8') || '{}';
    return JSON.parse(json) as RootConfig;
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!repoOwner || !repoName || !filePath || !token) {
      return res.status(500).json({ ok: false, error: 'Missing GitHub env vars' });
    }

    if (!BASE_DIR) {
      return res.status(500).json({ ok: false, error: 'Missing GITHUB_PATH base dir' });
    }

    // 1) lista todos os arquivos na pasta config-grepolis-bot/
    const listing = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: BASE_DIR,
    });

    if (!Array.isArray(listing.data)) {
      return res.status(200).json({ ok: true, accounts: [] });
    }

    // 2) carrega mapa de online-accounts
    const online = await loadOnlineStore();

    const ONLINE_WINDOW_MS = 120_000; // 2 min
    const now = Date.now();

    const accountsResult: any[] = [];

    for (const item of listing.data) {
      if (item.type !== 'file') continue;
      if (!item.name.endsWith('.json')) continue;
      if (!item.name.startsWith('config_')) continue;
      if (item.name === 'config-grepolis-bot.json') continue; // segurança

      // nome do arquivo: config_<account>.json
      const withoutPrefix = item.name.slice('config_'.length); // "<account>.json"
      const account = withoutPrefix.replace(/\.json$/i, '');   // "<account>"

      const cfg = await loadAccountConfig(item.path);
      if (!cfg) continue;

      // calcula se está online a partir do online-accounts.json
      let lastSeen: string | null = null;
      let isOnline = false;

      const info = online[account] || {};
      for (const clientId of Object.keys(info)) {
        const tsStr = info[clientId].last_seen;
        const ts = new Date(tsStr).getTime();
        if (!Number.isNaN(ts)) {
          if (!lastSeen || ts > new Date(lastSeen).getTime()) {
            lastSeen = tsStr;
          }
          if (now - ts <= ONLINE_WINDOW_MS) {
            isOnline = true;
          }
        }
      }

      accountsResult.push({
        account,
        enabled: !!cfg.enabled,
        farmEnabled: !!cfg.farm?.enabled,
        intervalMin: cfg.farm?.interval_min ?? null,
        intervalMax: cfg.farm?.interval_max ?? null,
        updatedAt: cfg.updated_at || null,
        online: isOnline,
        lastSeen,
      });
    }

    return res.status(200).json({ ok: true, accounts: accountsResult });
  } catch (err: any) {
    console.error('list-accounts error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to list accounts' });
  }
}
