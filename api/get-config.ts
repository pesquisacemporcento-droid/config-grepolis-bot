import { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const repoOwner = 'SEU_USUARIO_GITHUB';
const repoName = 'SEU_REPOSITORIO';
const filePath = 'config-grepolis-bot/config.json';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { account } = req.query;
    const accountKey = decodeURIComponent(String(account || 'default'));

    let gitFile;
    try {
      gitFile = await octokit.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
      });
    } catch (e) {
      gitFile = null; // arquivo não existe
    }

    let store: any = {};
    if (gitFile && 'content' in gitFile.data) {
      const data = Buffer.from(gitFile.data.content, 'base64').toString('utf8');
      store = JSON.parse(data);
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
    return res.status(500).json({ error: err.message });
  }
}
