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

type ConfigStore = {
  [account: string]: RootConfig;
};

type OnlineStore = {
  [account: string]: {
    [clientId: string]: {
      last_seen: string;
    };
  };
};

const CONFIG_FILE = (filePath ? filePath.replace(/\/$/, '') + '/' : '') + 'config-grepolis-bot.json';
const ONLINE_FILE = (filePath ? filePath.replace(/\/$/, '') + '/' : '') + 'online-accounts.json';

async function loadConfigStore(): Promise<ConfigStore> {
  try {
    const res = await octokit.repos.getContent({
      owner: repoOwner!,
      repo: repoName!,
      path: CONFIG_FILE,
    });

    if (!('content' in res.data)) return {};
    const buff = Buffer.from(res.data.content, 'base64');
    const json = buff.toString('utf8') || '{}';
    return JSON.parse(json) as ConfigStore;
  } catch (err: any) {
    if (err?.status === 404) return {};
    throw err;
  }
}

async function loadOnlineStore(): Promise<OnlineStore> {
  try {
    const res = await octokit.repos.getContent({
      owner: repoOwner!,
      repo: repoName!,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!repoOwner || !repoName || !filePath || !token) {
      return res.status(500).json({ ok: false, error: 'Missing GitHub env vars' });
    }

    const store  = await loadConfigStore();
    const online = await loadOnlineStore();

    const now = Date.now();
    const ONLINE_WINDOW_MS = 120_000; // 2 minutos

    const accounts = Object.keys(store).map(account => {
      const cfg = store[account];

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

      return {
        account,
        enabled: !!cfg.enabled,
        farmEnabled: !!cfg.farm?.enabled,
        intervalMin: cfg.farm?.interval_min ?? null,
        intervalMax: cfg.farm?.interval_max ?? null,
        updatedAt: cfg.updated_at || null,
        online: isOnline,
        lastSeen,
      };
    });

    return res.status(200).json({ ok: true, accounts });
  } catch (err: any) {
    console.error('list-accounts error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to list accounts' });
  }
}
