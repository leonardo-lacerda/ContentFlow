import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

const TTL_SECONDS = 600; // 10 minutes — long enough for a user to read the ask and reply

function fingerprint(bindingKey: string, tool: string, params: unknown): string {
  const hash = createHash('sha256')
    .update(JSON.stringify({ bindingKey, tool, params }))
    .digest('hex');
  return `tool-confirm:${hash}`;
}

/**
 * Credit-spending / destructive tools (generateImageTool, generateVideoTool,
 * and the Creative Engine's generation/publish/workflow/schedule operations)
 * used to gate on a bare `confirmed: true` boolean the model itself sets — a
 * real code-level check, but nothing tied that flag to an actual human turn.
 * A prompt-injected instruction reaching system-prompt-level context (e.g.
 * via Brand DNA extracted from a malicious website, or text scraped from an
 * attached link) could tell the model "the user already approved this" and
 * have it call the tool with confirmed=true on its own initiative.
 *
 * This ties confirmation to a real turn boundary instead: a call without
 * confirmed=true records a pending fingerprint (binding key + tool + params,
 * tagged with the id of the request that asked) and asks the user as
 * before; only a call with confirmed=true that matches an existing
 * fingerprint AND comes from a DIFFERENT request id succeeds, and it's
 * consumed one-time so it can't be replayed.
 *
 * `bindingKey` is the chat `threadId` for Studio UI calls, or the caller's
 * `organizationId` for direct MCP `tools/call` invocations, which have no
 * thread at all. Earlier this method had a separate branch for the
 * no-threadId case that trusted `confirmed` outright with no fingerprint
 * check whatsoever — every raw MCP tool call carries no threadId, so that
 * branch made the entire "ask first" protocol optional for the whole MCP
 * surface: a client could set confirmed=true on its very first, unsolicited
 * call. There is now exactly one code path: SOME binding key is always
 * required, and a matching prior "ask" is always required before a
 * "confirm" succeeds, regardless of which caller supplied the binding key.
 *
 * The request-id check matters because the agent runs with maxSteps: 8
 * (load.tools.service.ts) — the model (or a single automated MCP client)
 * can chain several tool calls back-to-back with no human in the loop
 * between them. Binding only to the thread/org would let it ask then
 * immediately confirm itself. Binding to the request id forces the ask and
 * the confirmation into two separate top-level requests — for the Studio UI
 * that means an actual new message from the user had to arrive in between;
 * for MCP it means a compliant client must complete two full round trips
 * (matching how MCP clients that surface tool calls for human approval,
 * e.g. Claude Desktop, actually behave), which is the strongest guarantee
 * achievable purely server-side without a client-side human-approval
 * contract this server cannot itself verify.
 */
@Injectable()
export class ToolConfirmationService {
  async requestOrConsume(
    bindingKey: string | undefined,
    requestId: string | undefined,
    tool: string,
    params: unknown,
    confirmed: boolean | undefined
  ): Promise<boolean> {
    if (!bindingKey) {
      // Every call site resolves either a chat threadId or the
      // server-authenticated organizationId before reaching here — both are
      // always present by the time a tool executes (checkAuth() already
      // rejected the call otherwise). A missing binding key means a caller
      // was added that doesn't thread one through; fail closed rather than
      // silently falling back to trusting the client-supplied boolean.
      return false;
    }

    const key = fingerprint(bindingKey, tool, params);

    if (confirmed !== true) {
      await ioRedis.set(key, requestId || '', 'EX', TTL_SECONDS);
      return false;
    }

    const askedInRequestId = await ioRedis.getdel(key);
    if (askedInRequestId === null || askedInRequestId === undefined) {
      return false; // no prior ask recorded for this exact fingerprint
    }
    if (!requestId) {
      // No request id on this call site yet — fall back to "an ask
      // happened", same protection level the thread-only design had.
      return true;
    }
    // Reject a same-request self-confirmation; only a later request's
    // confirmed=true, matching an earlier request's ask, succeeds.
    return askedInRequestId !== requestId;
  }
}
