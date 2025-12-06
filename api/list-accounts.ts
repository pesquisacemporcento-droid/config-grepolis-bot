import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const repoOwner = process.env.GITHUB_OWNER!;
const repoName = process.env.GITHUB_REPO!;
const filePath = process.env.GITHUB_PATH!;

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!repoOwner || !repoName || !filePath) {
      console.error('Env vars faltando em list-accounts:', { repoOwner, repoName, filePath });
      return res.status(500).json({ ok: false, error: 'Missing GitHub env vars' });
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
            console.error('Erro ao fazer JSON.parse em list-accounts, usando store vazio:', e);
            store = {};
          }
        }
      }
    } catch (e: any) {
      if (e.status === 404) {
        console.warn('config.json não encontrado em list-accounts, retornando lista vazia.');
        store = {};
      } else {
        console.error('Erro GitHub getContent em list-accounts:', e);
        return res.status(500).json({
          ok: false,
          error: 'GitHub getContent failed',
          detail: e.message || String(e),
        });
      }
    }

    const accounts = Object.entries(store).map(([account, cfg]: any) => {
      const farm = cfg?.farm || {};
      return {
        account,
        enabled: !!cfg.enabled,
        farmEnabled: !!farm.enabled,
        intervalMin: farm.interval_min ?? null,
        intervalMax: farm.interval_max ?? null,
        updatedAt: cfg.updated_at || null,
      };
    });

    return res.status(200).json({
      ok: true,
      accounts,
    });
  } catch (err: any) {
    console.error('Erro interno em GET /api/list-accounts:', err);
    return res.status(500).json({
      ok: false,
      error: 'Internal error',
      detail: err.message || String(err),
    });
  }
}
