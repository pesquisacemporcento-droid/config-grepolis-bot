export const config = {
  runtime: "edge",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const path = process.env.GITHUB_PATH;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo || !path) {
    return jsonResponse(
      { success: false, error: "Missing GitHub environment variables" },
      500
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON in request body" },
      400
    );
  }

  const configObj = body?.config;
  if (!configObj) {
    return jsonResponse(
      { success: false, error: "Missing 'config' field in body" },
      400
    );
  }

  const jsonString = JSON.stringify(configObj, null, 2);
  const base64Content = btoa(jsonString);

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}`;

  // 1) Tentar pegar o SHA atual (se o arquivo já existir)
  let existingSha: string | undefined;
  try {
    const getRes = await fetch(`${baseUrl}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (getRes.ok) {
      const data = (await getRes.json()) as { sha?: string };
      if (data.sha) existingSha = data.sha;
    }
  } catch {
    // se falhar aqui, tratamos como se o arquivo não existisse ainda
  }

  // 2) Montar body do PUT
  const payload: any = {
    message: "Atualizar config.json pelo painel web",
    content: base64Content,
    branch,
  };

  if (existingSha) {
    payload.sha = existingSha;
  }

  // 3) Enviar PUT para criar/atualizar o arquivo
  const putRes = await fetch(baseUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    return jsonResponse(
      {
        success: false,
        error: `GitHub PUT error: ${putRes.status}`,
        details: text,
      },
      putRes.status
    );
  }

  return jsonResponse({ success: true }, 200);
}
