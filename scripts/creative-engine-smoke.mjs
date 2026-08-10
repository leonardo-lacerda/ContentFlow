const baseUrl = (process.env.CREATIVE_SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const apiKey = process.env.CREATIVE_SMOKE_API_KEY;
const shouldRender = process.env.CREATIVE_SMOKE_RENDER === 'true';

if (!apiKey) {
  throw new Error('Set CREATIVE_SMOKE_API_KEY to an organization API key before running the smoke test.');
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${body?.message || body?.msg || text}`);
  return body;
}

const health = await request('/public/v1/creative/health');
const capabilities = await request('/public/v1/creative/capabilities');
const marker = `creative-smoke-${Date.now()}`;
const project = await request('/public/v1/creative/projects', {
  method: 'POST',
  body: JSON.stringify({ name: marker, objective: 'Disposable Creative Engine smoke test', aspectRatio: '9:16', maxDurationSec: 15 }),
});
const script = await request(`/public/v1/creative/projects/${project.id}/scripts`, {
  method: 'POST',
  body: JSON.stringify({
    name: `${marker}-script`,
    language: 'pt-BR',
    content: {
      language: 'pt-BR',
      totalDurationSec: 5,
      scenes: [{ index: 0, durationSec: 5, headline: 'Smoke', voiceoverText: 'Teste de operacao do Creative Engine', imagePrompt: 'Simple product shot' }],
    },
  }),
});

let render;
if (shouldRender) {
  render = await request('/public/v1/creative/renders', {
    method: 'POST',
    body: JSON.stringify({ projectId: project.id, scriptId: script.id, capability: 'captions', idempotencyKey: `${marker}-render` }),
  });
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  projectId: project.id,
  scriptId: script.id,
  capabilityCount: capabilities?.capabilities?.length || 0,
  providerHealthCount: health?.providers?.length || 0,
  renderJobId: render?.id || null,
}, null, 2));
