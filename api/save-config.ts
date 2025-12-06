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
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { account, config } = req.body;

    if (!account || !config) {
      return res.status(400).json({ error: 'Missing account or config' });
    }

    const accountKey = decodeURIComponent(account);

    // Lê o arquivo atual
    let gitFile;
    let store: any = {};
    let sha = null;

    try {
      gitFile = await octokit.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
      });

      if ('content' in gitFile.data) {
        const raw = Buffer.from(gitFile.data.content, 'base64').toString('utf8');
        store = JSON.parse(raw);
        sha = gitFile.data.sha;
      }
    } catch {
      store = {};
      sha = null;
    }

    // Atualiza ou cria config
    store[accountKey] = config;

    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      message: `Update config for ${accountKey}`,
      content: Buffer.from(JSON.stringify(store, null, 2)).toString('base64'),
      sha: sha || undefined,
    });

    return res.status(200).json({ ok: true, saved: accountKey });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
