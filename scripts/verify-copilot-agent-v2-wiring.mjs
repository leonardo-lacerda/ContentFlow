// Standalone regression check for the 2026-08-21 Studio chat silent-failure
// bug: production accepted every chat message, settled credits, and
// returned HTTP 200, but the assistant's reply never reached the client
// because `/copilot/agent` (apps/backend/src/api/routes/copilot.controller.ts)
// was wired through `copilotRuntimeNextJSAppRouterEndpoint` from the classic
// `@copilotkit/runtime` export, whose GraphQL resolver never learned to
// consume the `TEXT_MESSAGE_CHUNK` AG-UI wire event that `@ag-ui/mastra`
// emits - the run reported Success with zero text, silently. The fix moved
// `/agent` onto the `/v2` runtime module (`CopilotRuntime` +
// `createCopilotEndpointExpress`, single-route mode), which natively
// understands TEXT_MESSAGE_CHUNK.
//
// This isn't a Jest test because pulling `@copilotkit/runtime/v2` (or
// `@mastra/core`) into this repo's Jest project hits a pre-existing,
// unrelated gap: Jest's own module loader doesn't support Node 22+'s
// `require(esm)`, and several of their transitive dependencies
// (`@remix-run/node-fetch-server`, `@sindresorhus/slugify`, ...) are
// ESM-only. Plain `node` (used here) doesn't have that limitation.
//
// Run: node scripts/verify-copilot-agent-v2-wiring.mjs
// Exits 0 and prints "PASS" on success, exits 1 with details on failure.

import { AbstractAgent, EventType } from '@ag-ui/client';
import { CopilotRuntime, createCopilotEndpointExpress } from '@copilotkit/runtime/v2';
import { Observable } from 'rxjs';
import express from 'express';

class ChunkOnlyAgent extends AbstractAgent {
  constructor(reply) {
    super({ agentId: 'contentflow-studio' });
    this.reply = reply;
  }

  run(input) {
    return new Observable((subscriber) => {
      subscriber.next({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId });
      subscriber.next({ type: EventType.TEXT_MESSAGE_CHUNK, messageId: 'msg-1', delta: this.reply });
      subscriber.next({ type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId });
      subscriber.complete();
    });
  }

  clone() {
    return new ChunkOnlyAgent(this.reply);
  }
}

const REPLY = 'Oi, como posso ajudar você hoje?';

const app = express();
// Mirror production's real middleware chain, which double-parses the body on
// /copilot/*: main.ts mounts its own `json({ limit: '50mb' })` imported from
// `express` for these routes, and NestJS then runs its own built-in parser
// (platform-express pins body-parser 1.x). That only no-ops safely while both
// parsers are the same body-parser major - they agree on the `req._body`
// already-parsed marker. `express` is NOT a direct dependency by accident:
// declaring it (package.json) pins it to the 4.x that @nestjs/platform-express
// and @copilotkit/runtime both require. When it silently drifted to express 5
// (body-parser 2.x) via a transitive bump, the two parsers stopped agreeing,
// the second one re-read an already-consumed stream, and every single
// /copilot/* request died with `InternalServerError: stream is not readable`
// before ever reaching the controller. Reproduce that stack here so a future
// drift fails this check instead of production.
app.use(['/copilot/*', '/posts'], (req, res, next) => {
  express.json({ limit: '50mb' })(req, res, next);
});
app.use(express.json());
app.post('/copilot/agent', (req, res, next) => {
  const runtime = new CopilotRuntime({ agents: { 'contentflow-studio': new ChunkOnlyAgent(REPLY) } });
  const router = createCopilotEndpointExpress({
    runtime,
    basePath: '/copilot/agent',
    mode: 'single-route',
    cors: false,
  });
  router(req, res, next);
});

const server = app.listen(0);
const fail = (message) => {
  console.error('FAIL:', message);
  server.close();
  process.exitCode = 1;
};

try {
  const port = server.address().port;
  const resp = await fetch(`http://localhost:${port}/copilot/agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      method: 'agent/run',
      params: { agentId: 'contentflow-studio' },
      body: {
        threadId: 'verify-thread',
        runId: 'verify-run',
        messages: [{ id: 'm1', role: 'user', content: 'oi' }],
        tools: [],
        context: [],
        state: {},
      },
    }),
  });

  if (resp.status !== 200) {
    fail(`expected HTTP 200, got ${resp.status}`);
  } else {
    const body = await resp.text();
    // This is the exact assertion that fails against the old wiring: the
    // classic endpoint returns 200 with an empty `messages` array and no
    // TEXT_MESSAGE_CONTENT at all.
    if (!body.includes('TEXT_MESSAGE_CONTENT')) {
      fail(`response never emitted TEXT_MESSAGE_CONTENT - this is the original bug. Body:\n${body}`);
    } else if (!body.includes(REPLY)) {
      fail(`response is missing the expected reply text. Body:\n${body}`);
    } else if (!body.includes('RUN_FINISHED') || body.includes('RUN_ERROR')) {
      fail(`run did not finish cleanly. Body:\n${body}`);
    } else {
      console.log('PASS: /copilot/agent (v2 runtime) correctly delivered TEXT_MESSAGE_CHUNK output as real assistant text.');
      server.close();
    }
  }
} catch (error) {
  fail(error instanceof Error ? error.stack : String(error));
}
