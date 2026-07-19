import { escapeDesignCopy, fillTemplateTokens } from './token-escape';

describe('token-escape', () => {
  it('escapes HTML special chars', () => {
    expect(escapeDesignCopy('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });

  it('restores allowed inline tags and newlines', () => {
    const out = escapeDesignCopy('Hello\n<em>world</em>');
    expect(out).toBe('Hello<br><em>world</em>');
  });

  it('fills known tokens and reports leftovers', () => {
    const { html, leftover } = fillTemplateTokens(
      '<div>{{HEADLINE}} {{UNKNOWN}}</div>',
      { HEADLINE: 'Hi' }
    );
    expect(html).toBe('<div>Hi {{UNKNOWN}}</div>');
    expect(leftover).toEqual(['UNKNOWN']);
  });
});
