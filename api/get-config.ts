import { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const repoOwner = process.env.GITHUB_OWNER!;
const repoName = process.env.GITHUB_REPO!;
const filePath = process.env.GITHUB_PATH!;

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { account } = req.query;
    const accountKey = decodeURIComponent(String(account || 'default'));

    if (!repoOwner || !repoName || !filePath) {
      console.error('Env vars faltando:', { repoOwner, repoName, filePath });
      return res.status(500).json({ error: 'Missing GitHub env vars' });
    }

    let store: any = {};

    try {
      const gitFile = await octokit.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
      });

      if ('content' in gitFile.data) {
        const raw = Buffer.from(gitFile.data.content, 'base64').toString('utf8').trim();
        if (raw) {
          try {
            store = JSON.parse(raw);
          } catch (e) {
            console.error('Erro ao fazer JSON.parse do config.json, usando {}:', e);
            store = {};
          }
        }
      }
    } catch (e: any) {
      // Se o arquivo não existir ainda, começamos com store vazio
      if (e.status === 404) {
        console.warn('config.json não encontrado no GitHub, usando store vazio.');
        store = {};
      } else {
        console.error('Erro GitHub getContent:', e);
        return res.status(500).json({
          error: 'GitHub getContent failed',
          detail: e.message || String(e),
        });
      }
    }

    const defaultConfig = {
      enabled: true,
      farm_level: 'custom',
      farm: {
        enabled: true,
        interval_min: 600,
        interval_max: 640,
        shuffle_cities: true,
      },
      market: {
        enabled: false,
        target_town_id: '',
        send_wood: true,
        send_stone: true,
        send_silver: true,
        max_storage_percent: 80,
        max_send_per_trip: 10000,
        check_interval: 300,
        delay_between_trips: 60,
        split_equally: true,
      },
    };

    const config = store[accountKey] || defaultConfig;

    return res.status(200).json({
      ok: true,
      account: accountKey,
      config,
    });
  } catch (err: any) {
    console.error('Erro interno em GET /api/get-config:', err);
    return res.status(500).json({
      error: 'Internal error',
      detail: err.message || String(err),
    });
  }
}
