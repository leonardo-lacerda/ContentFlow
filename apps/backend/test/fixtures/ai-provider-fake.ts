import express from 'express';
import { randomUUID } from 'crypto';

// Deterministic fake standing in for two real external services in E2E:
//
//   1. Kie.ai's OpenAI-compatible Chat Completions endpoint, hit by
//      libraries/nestjs-libraries/src/chat/load.tools.service.ts via
//      `createOpenAI({ baseURL: KIEAI_CHAT_BASE_URL }).chat(model)` (ai-sdk
//      POSTs to `${baseURL}/chat/completions`). .env.test points
//      KIEAI_CHAT_BASE_URL at this server's :4400/v1, so the Studio chat
//      agent's model calls land here instead of the real Kie API.
//
//   2. Kie.ai's market-model job endpoints, hit by
//      libraries/nestjs-libraries/src/creative-engine/providers/kie/kie-api.client.ts
//      (createMarketTask/generateVeo/getTask/cancelTask - see that file for
//      the exact paths below, copied from its own `request()` calls).
//      NOTE: as of this writing .env.test does not set CREATIVE_KIE_BASE_URL
//      (kie-api.client.ts defaults that to the real https://api.kie.ai) and
//      leaves CREATIVE_KIE_ENABLED=false, so KieApiClient.isConfigured()
//      is false and these routes are never actually reached by the current
//      env - `assertConfigured()` throws before any fetch. They're kept
//      here, matching AI_GENERATE_BASE_URL, for whenever a future spec flips
//      CREATIVE_KIE_ENABLED=true and CREATIVE_KIE_BASE_URL=http://localhost:4400
///     to exercise real generation-pipeline wiring end to end.
//
// This proves the *pipeline* (the app calls out, parses the response,
// continues) - it says nothing about real generation quality, which is
// explicitly out of scope for E2E (see CLAUDE.md's testing philosophy and
// the task brief this harness was built from).

const app = express();
app.use(express.json({ limit: '25mb' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// --- 1. OpenAI-compatible Chat Completions (Studio chat agent) -----------
// A single fixed, tool-free assistant reply. The Studio chat specs in this
// harness don't currently exercise generation through the chat agent (they
// drive REST endpoints / the launches UI directly), so this only needs to be
// *reachable and shaped correctly* - real tool-call emulation would need a
// far more elaborate fake and isn't needed by any spec yet.
function chatCompletionResponse(model: string, content: string) {
  return {
    id: `chatcmpl-fake-${randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

app.post('/v1/chat/completions', (req, res) => {
  const model = req.body?.model || 'test-model';
  const content = 'Fake AI response from the E2E test fixture.';

  if (!req.body?.stream) {
    res.json(chatCompletionResponse(model, content));
    return;
  }

  // ai-sdk's OpenAI provider expects an SSE stream of
  // `chat.completion.chunk` objects terminated by `data: [DONE]`.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const chunk = {
    id: `chatcmpl-fake-${randomUUID()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      { index: 0, delta: { role: 'assistant', content }, finish_reason: null },
    ],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  const stopChunk = {
    ...chunk,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  };
  res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
});

// --- 2. Kie market/veo/image job endpoints --------------------------------
// In-memory task store so createTask -> recordInfo round-trips deterministically.
const tasks = new Map<string, { status: 'completed'; resultUrl: string }>();

const FAKE_ASSET_URL = 'https://example-fake-cdn.test/kie/fake-output.png';

app.post('/api/v1/jobs/createTask', (_req, res) => {
  const taskId = randomUUID();
  tasks.set(taskId, { status: 'completed', resultUrl: FAKE_ASSET_URL });
  res.json({ code: 200, data: { taskId } });
});

app.get('/api/v1/jobs/recordInfo', (req, res) => {
  const taskId = String(req.query.taskId || '');
  const task = tasks.get(taskId);
  if (!task) {
    res.status(404).json({ code: 404, msg: 'task not found' });
    return;
  }
  // kie-api.client.ts's parseTaskResult reads `resultJson` as a
  // JSON-*encoded string* on this endpoint family, not a nested object -
  // see its `withParsedResultJson` comment.
  res.json({
    code: 200,
    data: {
      taskId,
      status: task.status,
      resultJson: JSON.stringify({ resultUrls: [task.resultUrl] }),
    },
  });
});

app.post('/api/v1/jobs/cancelTask', (req, res) => {
  res.json({ code: 200, data: { taskId: req.query.taskId || req.body?.taskId } });
});

app.post('/api/v1/veo/generate', (_req, res) => {
  const taskId = randomUUID();
  tasks.set(taskId, { status: 'completed', resultUrl: FAKE_ASSET_URL });
  res.json({ code: 200, data: { taskId } });
});

app.get('/api/v1/veo/record-info', (req, res) => {
  const taskId = String(req.query.taskId || '');
  const task = tasks.get(taskId);
  if (!task) {
    res.status(404).json({ code: 404, msg: 'task not found' });
    return;
  }
  res.json({ code: 200, data: { taskId, status: task.status, response: { resultUrls: [task.resultUrl] } } });
});

app.post('/api/v1/veo/cancel', (req, res) => {
  res.json({ code: 200, data: { taskId: req.query.taskId } });
});

app.get('/api/v1/gpt4o-image/record-info', (req, res) => {
  const taskId = String(req.query.taskId || '');
  const task = tasks.get(taskId) || { status: 'completed' as const, resultUrl: FAKE_ASSET_URL };
  res.json({ code: 200, data: { taskId, status: task.status, response: { resultUrls: [task.resultUrl] } } });
});

app.post('/api/v1/gpt4o-image/cancel', (req, res) => {
  res.json({ code: 200, data: { taskId: req.query.taskId } });
});

const port = Number(process.env.AI_PROVIDER_FAKE_PORT || 4400);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ai-provider-fake] listening on :${port}`);
});
