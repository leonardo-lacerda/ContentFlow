import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CopilotKit } from '@copilotkit/react-core';
import { ContentPresentationAction } from './content-presentation-action';
import { resetArtifactCardOwners } from './content-presentation-payload';

// ContentIdeasCard calls useCopilotChat internally (for the artifact-action
// responder), which requires a CopilotKitProvider in the tree even though
// this test never sends a message.
const withProvider = (children: JSX.Element) => (
  <CopilotKit runtimeUrl="http://localhost/copilot/agent" agent="contentflow-studio">
    {children}
  </CopilotKit>
);

// Regression test for the 2026-08-22 "gere 3 ideias" bug: CopilotKit's
// legacy useCopilotAction re-registers a fresh `render` closure on every
// parent re-render (every streamed token), and the AG-UI adapter uses that
// closure identity as the JSX component type - so React fully unmounts and
// remounts ContentPresentationAction several times per tool call. The old
// code keyed card ownership off useId(), which is a *new* value on every one
// of those remounts, so only the first (possibly stale) mount's claim stuck
// and the card could vanish entirely. The fix keys ownership off the AG-UI
// toolCallId CopilotKit actually passes into render props (confirmed by
// reading node_modules/@copilotkit/react-core's ToolCallRenderer), which is
// stable across remounts of the same logical tool call.
const ideasArgs = {
  operation: 'ideas',
  ideas: [
    { id: 'idea_001', title: 'Por Tras das Cameras', hook: 'Voce nao vai acreditar...' },
  ],
};

describe('ContentPresentationAction remount stability', () => {
  beforeEach(() => {
    resetArtifactCardOwners();
    cleanup();
  });

  it('keeps rendering the card across a full unmount+remount with the same toolCallId', () => {
    const { unmount } = render(
      withProvider(
        <ContentPresentationAction args={ideasArgs} status="complete" toolCallId="call_abc123" />
      )
    );
    expect(screen.getByText('Por Tras das Cameras')).toBeTruthy();

    // Simulate CopilotKit remounting the component (new React component
    // instance -> a fresh useId() internally) for the *same* tool call, as
    // happens on every streamed token in the real app.
    unmount();
    render(
      withProvider(
        <ContentPresentationAction args={ideasArgs} status="complete" toolCallId="call_abc123" />
      )
    );

    expect(screen.getByText('Por Tras das Cameras')).toBeTruthy();
  });

  it('still suppresses a genuinely different tool call that emits identical content', () => {
    render(
      withProvider(
        <ContentPresentationAction args={ideasArgs} status="complete" toolCallId="call_first" />
      )
    );
    expect(screen.getByText('Por Tras das Cameras')).toBeTruthy();

    // A different toolCallId claiming the exact same content signature is the
    // real duplicate-tool-call scenario this ownership map guards against,
    // and must still be suppressed.
    const { container } = render(
      withProvider(
        <ContentPresentationAction args={ideasArgs} status="complete" toolCallId="call_second" />
      )
    );
    expect(container.textContent).toBe('');
  });
});
