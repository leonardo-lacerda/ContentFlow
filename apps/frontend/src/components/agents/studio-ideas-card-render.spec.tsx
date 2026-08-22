import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CopilotKit, useCopilotAction } from '@copilotkit/react-core';
import { CopilotChat, AssistantMessage as DefaultAssistantMessage } from '@copilotkit/react-ui';
import type { AssistantMessageProps } from '@copilotkit/react-ui';
import { ContentPresentationAction } from './content-presentation-action';

// Regression test for the 2026-08-21 finding: asking Studio for ideas
// ("gere 3 ideias") makes the model correctly call the backend's
// contentPresentationTool (confirmed via a raw-SSE probe against the real
// backend: TOOL_CALL_START/ARGS/END/RESULT all arrive with the 3 real
// ideas), and the assistant's short text reply appears - but the ideas
// card itself never renders, leaving the user with no way to act on the
// ideas. This isolates the render side: does @copilotkit/react-ui's
// CopilotChat + useCopilotAction({ available: 'frontend' }) actually turn
// a real captured AG-UI tool-call SSE stream into rendered output at all,
// independent of this app's own card components (StudioAssistantMessage,
// ContentIdeasCard, etc.)?
//
// The SSE body below is byte-for-byte what the real backend returned for
// "gere 3 ideias" through the exact same v2 CopilotRuntime +
// createCopilotEndpointExpress wiring copilot.controller.ts uses in
// production (captured via scripts/verify-copilot-agent-v2-wiring.mjs's
// technique, run manually against the live tool + model).
const REAL_SSE_BODY = `data: {"type":"RUN_STARTED","threadId":"ideas-repro-1","runId":"r1","input":{"threadId":"ideas-repro-1","runId":"r1","state":{},"messages":[{"id":"m1","role":"user","content":"gere 3 ideias"}],"tools":[],"context":[]}}

data: {"type":"TOOL_CALL_START","parentMessageId":"df978509-d235-4e54-8130-f46eaf3e970f","toolCallId":"call_ab606265373145f3bcfcc1124b0c68ce","toolCallName":"contentPresentationTool"}

data: {"type":"TOOL_CALL_ARGS","toolCallId":"call_ab606265373145f3bcfcc1124b0c68ce","delta":"{\\"ideas\\":[{\\"angle\\":\\"Bastidores do processo criativo.\\",\\"audiencePain\\":\\"Dificuldade em mostrar valor.\\",\\"format\\":\\"Reels\\",\\"hook\\":\\"Voce nao vai acreditar...\\",\\"id\\":\\"idea_001\\",\\"objective\\":\\"Engajamento\\",\\"platform\\":\\"Instagram\\",\\"suggestedCaption\\":\\"legenda 1\\",\\"suggestedCta\\":\\"Comente SIM\\",\\"title\\":\\"Por Tras das Cameras\\"},{\\"angle\\":\\"Desmistificando um erro comum.\\",\\"audiencePain\\":\\"Frustracao.\\",\\"format\\":\\"Carrossel\\",\\"hook\\":\\"Pare de fazer isso.\\",\\"id\\":\\"idea_002\\",\\"objective\\":\\"Autoridade\\",\\"platform\\":\\"LinkedIn\\",\\"suggestedCaption\\":\\"legenda 2\\",\\"suggestedCta\\":\\"Salve este post\\",\\"title\\":\\"O erro que trava seu progresso\\"},{\\"angle\\":\\"Lista de curadoria.\\",\\"audiencePain\\":\\"Excesso de opcoes.\\",\\"format\\":\\"Lista\\",\\"hook\\":\\"3 ferramentas que uso todo dia.\\",\\"id\\":\\"idea_003\\",\\"objective\\":\\"Alcance\\",\\"platform\\":\\"Twitter\\",\\"suggestedCaption\\":\\"legenda 3\\",\\"suggestedCta\\":\\"Me conta nos comentarios\\",\\"title\\":\\"Curadoria de Ferramentas Indispensaveis\\"}],\\"operation\\":\\"ideas\\",\\"title\\":\\"Ideias de Conteudo Personalizadas\\"}"}

data: {"type":"TOOL_CALL_END","toolCallId":"call_ab606265373145f3bcfcc1124b0c68ce"}

data: {"type":"TOOL_CALL_RESULT","toolCallId":"call_ab606265373145f3bcfcc1124b0c68ce","content":"{\\"result\\":{\\"type\\":\\"IDEAS\\",\\"source\\":\\"contentPresentationTool\\",\\"title\\":\\"Ideias de Conteudo Personalizadas\\",\\"ideas\\":[{\\"id\\":\\"idea_001\\",\\"title\\":\\"Por Tras das Cameras\\"},{\\"id\\":\\"idea_002\\",\\"title\\":\\"O erro que trava seu progresso\\"},{\\"id\\":\\"idea_003\\",\\"title\\":\\"Curadoria de Ferramentas Indispensaveis\\"}],\\"requiresUserSelection\\":true}}","messageId":"6f8e8e44-5462-4655-8a26-c925e6a77552","role":"tool"}

data: {"type":"TEXT_MESSAGE_START","messageId":"df978509-d235-4e54-8130-f46eaf3e970f-agui-text","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"df978509-d235-4e54-8130-f46eaf3e970f-agui-text","delta":"Aqui estao"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"df978509-d235-4e54-8130-f46eaf3e970f-agui-text","delta":" as tres ideias de conteudo estruturadas para voce aplicar agora mesmo."}

data: {"type":"TEXT_MESSAGE_END","messageId":"df978509-d235-4e54-8130-f46eaf3e970f-agui-text"}

data: {"type":"RUN_FINISHED","threadId":"ideas-repro-1","runId":"r1"}
`;

function TestAssistantMessage(props: AssistantMessageProps) {
  // Matches the real app's StudioAssistantMessage: DefaultAssistantMessage
  // wrapped in an extra div, plus a rewritten `message.content` (here: a
  // no-op passthrough) - testing whether wrapping breaks tool-call injection.
  return (
    <div className="cf-studio__assistant-message">
      <DefaultAssistantMessage {...props} message={{ ...props.message, content: props.message?.content } as any} />
    </div>
  );
}

function IdeasAction() {
  useCopilotAction({
    name: 'contentPresentationTool',
    available: 'frontend',
    render: ({ args, status }) => (
      <ContentPresentationAction args={args as Record<string, any>} status={status} />
    ),
  });
  return null;
}

describe('Studio ideas card rendering against a real captured AG-UI tool-call stream', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (body.method === 'info') {
          return new Response(
            JSON.stringify({
              version: '1.60.1',
              agents: { 'contentflow-studio': { name: 'contentflow-studio' } },
              telemetryDisabled: true,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        return new Response(REAL_SSE_BODY, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the ideas card (not just the plain-text reply) for a real tool-call SSE stream', async () => {
    render(
      <CopilotKit runtimeUrl="http://localhost/copilot/agent" agent="contentflow-studio">
        <IdeasAction />
        <CopilotChat AssistantMessage={TestAssistantMessage} />
      </CopilotKit>
    );

    // Drive the real, non-deprecated send path: type into CopilotChat's own
    // default Input and submit it, exactly as a user would in the browser -
    // not the internally-broken `appendMessage` legacy API.
    const textbox = await screen.findByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'gere 3 ideias' } });
    fireEvent.keyDown(textbox, { key: 'Enter', code: 'Enter' });

    await waitFor(
      () => {
        expect(screen.getByText(/aplicar agora mesmo/i)).toBeTruthy();
      },
      { timeout: 5000 }
    );

    await waitFor(
      () => {
        expect(screen.getByText('Curadoria de Ferramentas Indispensaveis')).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });
});
