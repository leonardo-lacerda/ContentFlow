const redisStore = new Map<string, string>();
jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: {
    set: jest.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    getdel: jest.fn(async (key: string) => {
      const value = redisStore.get(key);
      redisStore.delete(key);
      return value;
    }),
  },
}));

import { ToolConfirmationService } from './tool-confirmation.service';

// Regression test for a bypass found while re-verifying the 2026-08-20 audit
// fix: the agent runs with maxSteps: 8 (load.tools.service.ts), so within
// ONE HTTP request the model can autonomously call a tool unconfirmed, see
// the "please confirm" error, and immediately call it again with
// confirmed=true — no real user turn involved at all. Binding the pending
// confirmation only to threadId doesn't stop that, since both calls share
// the same thread. This service also binds to a per-request id (set once
// per incoming /copilot/agent request) and requires the confirming call to
// come from a DIFFERENT request than the one that asked.
describe('ToolConfirmationService', () => {
  let service: ToolConfirmationService;

  beforeEach(() => {
    redisStore.clear();
    service = new ToolConfirmationService();
  });

  // Regression test for the CONFIRMED-1 finding in the 2026-08-20 audit: a
  // raw MCP `tools/call` request never carries a chat threadId, and this
  // service used to treat a missing threadId as "trust the caller's
  // confirmed flag outright" — meaning every MCP-invoked credit-spending or
  // publish/schedule tool could be called with confirmed=true on its very
  // first, unsolicited invocation, no prior "ask" required at all. There is
  // now no code path where a missing binding key succeeds.
  it('fails closed with no binding key at all, regardless of the confirmed flag', async () => {
    await expect(
      service.requestOrConsume(undefined, undefined, 'tool', { a: 1 }, true)
    ).resolves.toBe(false);
    await expect(
      service.requestOrConsume(undefined, undefined, 'tool', { a: 1 }, false)
    ).resolves.toBe(false);
  });

  // MCP tool-call sites pass the caller's organizationId as the binding key
  // in place of a threadId. It must go through the exact same two-request
  // ask-then-confirm protocol as the chat-thread path — a single call with
  // confirmed=true and no preceding ask must still be refused.
  it('requires a real prior ask for an MCP call bound by organizationId, even with confirmed=true on the first call', async () => {
    await expect(
      service.requestOrConsume('org-1', 'req-A', 'tool', { a: 1 }, true)
    ).resolves.toBe(false);
  });

  it('allows an MCP (organizationId-bound) confirmation from a genuinely separate later request', async () => {
    await expect(
      service.requestOrConsume('org-1', 'req-A', 'tool', { a: 1 }, undefined)
    ).resolves.toBe(false);

    await expect(
      service.requestOrConsume('org-1', 'req-B', 'tool', { a: 1 }, true)
    ).resolves.toBe(true);
  });

  it('keeps organizationId-bound confirmations isolated between organizations', async () => {
    await service.requestOrConsume('org-1', 'req-A', 'tool', { a: 1 }, undefined);

    await expect(
      service.requestOrConsume('org-2', 'req-B', 'tool', { a: 1 }, true)
    ).resolves.toBe(false);
  });

  it('records a pending ask and refuses an immediate confirmed=true with nothing preceding it', async () => {
    await expect(
      service.requestOrConsume('thread-1', 'req-A', 'tool', { a: 1 }, true)
    ).resolves.toBe(false);
  });

  it('BLOCKS a same-request self-confirmation (the maxSteps chaining bypass)', async () => {
    // The model, within one request/generate() call, calls the tool
    // unconfirmed, sees the error, and immediately retries confirmed=true —
    // both steps carry the SAME requestId because they're the same
    // top-level HTTP request.
    await expect(
      service.requestOrConsume('thread-1', 'req-A', 'tool', { a: 1 }, undefined)
    ).resolves.toBe(false);

    await expect(
      service.requestOrConsume('thread-1', 'req-A', 'tool', { a: 1 }, true)
    ).resolves.toBe(false);
  });

  it('ALLOWS confirmation from a genuinely later, separate request', async () => {
    await expect(
      service.requestOrConsume('thread-1', 'req-A', 'tool', { a: 1 }, undefined)
    ).resolves.toBe(false);

    // A new user message arrives -> new /copilot/agent request -> new
    // requestId.
    await expect(
      service.requestOrConsume('thread-1', 'req-B', 'tool', { a: 1 }, true)
    ).resolves.toBe(true);
  });

  it('is one-time use — a second confirmed=true for the same ask fails even from a third request', async () => {
    await service.requestOrConsume('thread-1', 'req-A', 'tool', { a: 1 }, undefined);
    await service.requestOrConsume('thread-1', 'req-B', 'tool', { a: 1 }, true);

    await expect(
      service.requestOrConsume('thread-1', 'req-C', 'tool', { a: 1 }, true)
    ).resolves.toBe(false);
  });

  it('does not confirm a different fingerprint (different params) than what was asked', async () => {
    await service.requestOrConsume('thread-1', 'req-A', 'tool', { prompt: 'a cat' }, undefined);

    await expect(
      service.requestOrConsume('thread-1', 'req-B', 'tool', { prompt: 'a dog' }, true)
    ).resolves.toBe(false);
  });

  it('keeps threads isolated — an ask in one thread does not confirm in another', async () => {
    await service.requestOrConsume('thread-1', 'req-A', 'tool', { a: 1 }, undefined);

    await expect(
      service.requestOrConsume('thread-2', 'req-B', 'tool', { a: 1 }, true)
    ).resolves.toBe(false);
  });
});
