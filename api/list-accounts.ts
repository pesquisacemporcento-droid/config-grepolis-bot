// /api/list-accounts.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const repoOwner = process.env.GITHUB_OWNER;
const repoName  = process.env.GITHUB_REPO;
const filePath  = process.env.GITHUB_PATH; // ex: "config-grepolis-bot"
const token     = process.env.GITHUB_TOKEN;

const baseDir = filePath ? filePath.replace(/\/$/, '') : ''; // tira barra no final, se tiver

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

const ONLINE_FILE = (baseDir ? baseDir + '/' : '') + 'online-accounts.json';

// ------------------------------------------------------------------
// Lê todos os config_<account>.json dentro da pasta baseDir
// ------------------------------------------------------------------
async function loadConfigStore(): Promise<ConfigStore> {
  const store: ConfigStore = {};

  if (!repoOwner || !repoName) return store;

  try {
    const dirPath = baseDir || ''; // ex: "config-grepolis-bot"
    const res = await octokit.repos.getContent({
      owner: repoOwner!,
      repo: repoName!,
      path: dirPath,
    });

    if (!Array.isArray(res.data)) {
      // Não é diretório
      return store;
    }

    const files = res.data;

    for (const item of files) {
      if (item.type !== 'file') continue;
      // Procurar arquivos do tipo config_<ACCOUNT>.json
      const match = item.name.match(/^config_(.+)\.json$/i);
      if (!match) continue;

      const account = match[1]; // ex: "br14_ANDE LUZ E MARIA"

      const fileRes = await octokit.repos.getContent({
        owner: repoOwner!,
        repo: repoName!,
        path: item.path!, // caminho completo dentro do repo
      });

      if (!('content' in fileRes.data)) continue;

      const buff = Buffer.from(fileRes.data.content, 'base64');
      const jsonStr = buff.toString('utf8') || '{}';

      try {
        const cfg = JSON.parse(jsonStr) as RootConfig;
        store[account] = cfg;
      } catch (e) {
        // Se der erro de parse, ignora essa conta
        console.warn('Erro parse config for account', account);
      }
    }

    return store;
  } catch (err: any) {
    if (err?.status === 404) {
      // Pasta não encontrada
      return {};
    }
    throw err;
  }
}

// ------------------------------------------------------------------
// Lê arquivo online-accounts.json (batido pelo heartbeat)
// ------------------------------------------------------------------
async function loadOnlineStore(): Promise<OnlineStore> {
  if (!repoOwner || !repoName) return {};

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

// ------------------------------------------------------------------
// Handler principal
// ------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!repoOwner || !repoName || !token) {
      return res.status(500).json({ ok: false, error: 'Missing GitHub env vars' });
    }

    const store  = await loadConfigStore();
    const online = await loadOnlineStore();

    const now = Date.now();
    const ONLINE_WINDOW_MS = 120_000; // 2 minutos

    // ⚠️ IMPORTANTE:
    // Usar a UNIÃO das contas que têm config + contas que estão online,
    // assim até contas que só mandaram heartbeat aparecem na lista.
    const accountSet = new Set<string>([
      ...Object.keys(store),
      ...Object.keys(online),
    ]);

    const accounts = Array.from(accountSet).map(account => {
      const cfg: RootConfig | undefined = store[account];

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
        enabled: !!cfg?.enabled,
        farmEnabled: !!cfg?.farm?.enabled,
        intervalMin: cfg?.farm?.interval_min ?? null,
        intervalMax: cfg?.farm?.interval_max ?? null,
        updatedAt: cfg?.updated_at || null,
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
