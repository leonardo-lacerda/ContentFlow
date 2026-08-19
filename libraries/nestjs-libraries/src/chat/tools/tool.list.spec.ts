// Transitive ESM/CJS chains that break Jest when loading tool.list.ts:
//   1. nostr-tools (ESM) via nostr.provider.ts → integration.manager.ts → integration.*.tool.ts
//   2. isomorphic-dompurify/jsdom via integration.schedule.post.ts → posts.service.ts → create.post.dto.ts
// Both are stubbed here because this spec only cares about class-reference
// identity within the list arrays, not the actual tool implementations.
jest.mock('nostr-tools', () => ({
  getPublicKey: jest.fn(),
  Relay: class Relay {},
  finalizeEvent: jest.fn(),
  SimplePool: class SimplePool {},
  generateSecretKey: jest.fn(),
  nip04: { encrypt: jest.fn(), decrypt: jest.fn() },
  nip19: { npubEncode: jest.fn(), nsecEncode: jest.fn() },
}));
jest.mock('isomorphic-dompurify', () => ({ sanitize: (s: string) => s }));

import {
  toolList,
  studioToolList,
  studioMcpToolList,
  allToolProviders,
} from './tool.list';
import { CreationOptionsTool } from './creation.options.tool';

// Guards for the three tool lists:
// - toolList: the original MCP list (backward-compat, must stay unchanged)
// - studioToolList: the UI Studio list (has CreationOptionsTool for the configurator card)
// - studioMcpToolList: the headless MCP Studio list (must NOT have CreationOptionsTool)
// Any change to these lists that breaks existing MCP clients or the headless
// contract should fail here first.

describe('tool lists', () => {
  describe('studioMcpToolList', () => {
    it('does not include CreationOptionsTool (headless-incompatible)', () => {
      expect(studioMcpToolList).not.toContain(CreationOptionsTool);
    });

    it('has the same length as studioToolList minus CreationOptionsTool', () => {
      const studioWithout = studioToolList.filter((t) => t !== CreationOptionsTool);
      expect(studioMcpToolList.length).toBe(studioWithout.length);
    });

    it('contains every tool from studioToolList except CreationOptionsTool', () => {
      const studioWithout = studioToolList.filter((t) => t !== CreationOptionsTool);
      for (const tool of studioWithout) {
        expect(studioMcpToolList).toContain(tool);
      }
    });
  });

  describe('studioToolList', () => {
    it('includes CreationOptionsTool (required for UI configurator card)', () => {
      expect(studioToolList).toContain(CreationOptionsTool);
    });
  });

  describe('allToolProviders', () => {
    it('covers every tool class that appears in any list, each once', () => {
      const allLists = [...toolList, ...studioToolList, ...studioMcpToolList];
      const unique = [...new Set(allLists)];
      for (const tool of unique) {
        expect(allToolProviders).toContain(tool);
      }
    });

    it('has no duplicates', () => {
      const seen = new Set();
      for (const tool of allToolProviders) {
        expect(seen.has(tool)).toBe(false);
        seen.add(tool);
      }
    });
  });
});
