'use client';

import React, {
  Component,
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { sanitizeHtml } from '@gitroom/frontend/components/layout/sanitize-html';
import {
  AssistantMessage as DefaultAssistantMessage,
  CopilotChat,
  CopilotKitCSSProperties,
} from '@copilotkit/react-ui';
import {
  AssistantMessageProps,
  InputProps,
  UserMessageProps,
} from '@copilotkit/react-ui/dist/components/chat/props';
import { Input } from '@gitroom/frontend/components/agents/agent.input';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  CopilotKit,
  useCopilotChat,
  useCopilotAction,
  useCopilotContext,
  useCopilotMessagesContext,
} from '@copilotkit/react-core';
import {
  MediaPortal,
  PropertiesContext,
} from '@gitroom/frontend/components/agents/agent';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  Role,
  TextMessage,
  ActionExecutionMessage,
  ResultMessage,
} from '@copilotkit/runtime-client-gql';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { CreationOptionsCard } from '@gitroom/frontend/components/agents/creation-options.component';
import {
  CarouselPreviewCard,
  ContentIdeasCard,
  type ContentIdea,
} from '@gitroom/frontend/components/agents/content-artifacts.component';
import { extractSummaryIdeasArtifact } from '@gitroom/frontend/components/agents/idea-summary-parser';
import { ContentPresentationAction } from '@gitroom/frontend/components/agents/content-presentation-action';
import { CardErrorBoundary } from '@gitroom/frontend/components/agents/card-error-boundary';
import {
  artifactSignature,
  claimArtifactCard,
  resetArtifactCardOwners,
} from '@gitroom/frontend/components/agents/content-presentation-payload';

/**
 * CopilotKit caches an action's `render` the first time it is registered and
 * keeps that closure for the life of the chat. Under StrictMode/HMR the
 * component instance that produced the closure can be replaced, and the
 * captured `appendMessage`/`setState` then belong to a dead instance: the
 * artifact buttons call them and nothing happens. Routing every click through
 * this live handle means a cached render always reaches the mounted instance.
 */
const liveArtifactAction: {
  current: ((value: Record<string, unknown>) => Promise<void>) | null;
} = { current: null };

/**
 * The chat input's `onSend` is the only send path that actually reaches the
 * agent here. `useCopilotChat().appendMessage` is the pre-AG-UI API (deprecated
 * in favour of `sendMessage`, which this build gates behind a CopilotKit Cloud
 * publicApiKey): the message it appends never lands in the AG-UI message list,
 * so the run goes out with the *previous* user message and the agent just
 * repeats the last step. Artifact buttons reuse the input's channel instead, so
 * a button click travels exactly like a typed message.
 */
const liveSendMessage: {
  current: ((text: string) => Promise<unknown>) | null;
} = { current: null };

const dispatchArtifactAction = async (value: Record<string, unknown>) => {
  if (!liveArtifactAction.current) return;
  await liveArtifactAction.current(value);
};

const classifyChatError = (errorEvent: any): 'provider' | 'credits' => {
  const status = errorEvent?.context?.response?.status;
  const message = [
    errorEvent?.error?.message,
    errorEvent?.context?.error?.message,
    errorEvent?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    status === 402 ||
    /insufficient credits|sem créditos|credit balance|credit debt|payment required/.test(message)
  ) {
    return 'credits';
  }

  return 'provider';
};

/**
 * Everything that talks to CopilotKit lives here rather than in
 * AgentChatContent. `useCopilotAction` and `useCopilotChat` register against
 * the nearest CopilotKit provider, so calling them in the component that
 * *renders* <CopilotKit> puts them outside it: the Studio actions would never
 * be sent to the agent and the model could not render any artifact card.
 */
const StudioChat: FC = () => {
  const t = useT();
  const { isLoading } = useCopilotChat();
  const [chatError, setChatError] = useState<'provider' | 'credits' | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const actionStatusTimer = useRef<number | null>(null);
  const actionInFlight = useRef<string | null>(null);
  // Tracks whether the agent run for the current action actually started, so we
  // only clear the status banner once that run *finishes* — not on the brief
  // window before isLoading flips to true.
  const actionRunSawLoading = useRef(false);

  // CopilotKit assigns a real thread id internally the moment the provider
  // mounts (props.threadId || randomUUID()), even on `/studio/new` — but the
  // URL never picks it up, so a reload of a brand-new conversation loses it
  // (params.id is still literally "new", a different id than the one the
  // agent run actually used) and any duplicate card produced during that run
  // gets replayed forever on every future reload once it's next opened by id,
  // since there is nothing to replay under "new". Swap the URL to the real id
  // as soon as the first message is in flight, without adding a history entry.
  //
  // This MUST use window.history.replaceState, not router.replace: router.replace
  // pushes a real Next.js navigation, which updates useParams() to the new id
  // mid-send. That re-runs LoadMessages' [id] effect, which fetches the new
  // thread's message list — empty, because the very first message hasn't been
  // persisted yet — and setMessages([]) wipes the in-flight message off screen
  // (reported as "I send the first message, the screen reloads and nothing is
  // sent; every message after that works"). history.replaceState updates only
  // the address bar, so useParams() stays "new" for this session (no remount,
  // no LoadMessages re-run, run continues), while a later hard reload still
  // reads the real id straight from the URL.
  const params = useParams<{ id: string }>();
  const { threadId: liveThreadId } = useCopilotContext();
  useEffect(() => {
    if (params.id === 'new' && isLoading && liveThreadId) {
      window.history.replaceState(null, '', `/studio/${liveThreadId}`);
    }
  }, [params.id, isLoading, liveThreadId]);
  const sendArtifactAction = useCallback(
    async (value: Record<string, unknown>) => {
      const action = String(value.action || 'continue');
      const actionKey = JSON.stringify({ action, payload: value });
      if (actionInFlight.current === actionKey) return;
      actionInFlight.current = actionKey;
      if (actionStatusTimer.current) {
        window.clearTimeout(actionStatusTimer.current);
      }
      actionRunSawLoading.current = false;
      setChatError(null);
      setActionStatus(action);
      try {
        if (!liveSendMessage.current) {
          throw new Error('Chat input is not ready to send the artifact action');
        }
        await liveSendMessage.current(
          `[--content-action--]\nACTION: ${action}. Execute this button action now and return the next Studio artifact, not a generic explanation.\nPAYLOAD: ${JSON.stringify(value)}\n[--content-action--]`
        );
      } catch (error) {
        console.error('[AgentChat] action request failed', error);
        setActionStatus(null);
        if (actionInFlight.current === actionKey) actionInFlight.current = null;
        setChatError('provider');
        throw error;
      } finally {
        // Backstop only: if the run state never resolves (dropped connection,
        // provider hang), clear the banner and surface a retriable error rather
        // than leaving the user staring at a spinner forever.
        actionStatusTimer.current = window.setTimeout(() => {
          if (actionInFlight.current === actionKey) {
            actionInFlight.current = null;
            setActionStatus(null);
            setChatError('provider');
          }
          actionStatusTimer.current = null;
        }, 90000);
      }
    },
    []
  );

  // Clear the action banner exactly when the agent run that the action started
  // completes. This is what stops the "spinner appears then silently vanishes"
  // behaviour: the banner now mirrors the real run instead of a blind timeout.
  useEffect(() => {
    if (!actionStatus) return;
    if (isLoading) {
      actionRunSawLoading.current = true;
      return;
    }
    if (!actionRunSawLoading.current) return;
    const timer = window.setTimeout(() => {
      setActionStatus(null);
      actionRunSawLoading.current = false;
      actionInFlight.current = null;
      if (actionStatusTimer.current) {
        window.clearTimeout(actionStatusTimer.current);
        actionStatusTimer.current = null;
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [isLoading, actionStatus]);

  useEffect(() => () => {
    if (actionStatusTimer.current) window.clearTimeout(actionStatusTimer.current);
  }, []);

  useEffect(() => {
    liveArtifactAction.current = sendArtifactAction;
    return () => {
      if (liveArtifactAction.current === sendArtifactAction) {
        liveArtifactAction.current = null;
      }
    };
  }, [sendArtifactAction]);

  useCopilotAction({
    name: 'showCreationOptions',
    description:
      'Open the simple creation configurator before generating any image, video, carousel or text content. Always call this action for a new creative request instead of only replying with a text list of options. Wait for the user selection and use the returned options in the next generation or content tool call.',
    parameters: [
      {
        name: 'creationType',
        type: 'string',
        enum: ['image', 'video', 'carousel', 'text'],
        description: 'The type of content the user wants to create.',
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: 'A short title for the creation task.',
        required: true,
      },
      {
        name: 'brief',
        type: 'string',
        description: 'A concise summary of what the user wants to create.',
        required: false,
      },
      {
        name: 'suggestedPlatform',
        type: 'string',
        description: 'Suggested channel based on the user request.',
        required: false,
      },
      {
        name: 'suggestedAspectRatio',
        type: 'string',
        description: 'Suggested aspect ratio based on the channel.',
        required: false,
      },
      {
        name: 'suggestedTone',
        type: 'string',
        description: 'Suggested communication tone.',
        required: false,
      },
      {
        name: 'suggestedStyle',
        type: 'string',
        description: 'Suggested visual style for an image.',
        required: false,
      },
      {
        name: 'suggestedDurationSec',
        type: 'number',
        description: 'Suggested video duration in seconds.',
        required: false,
      },
      {
        name: 'suggestedSlideCount',
        type: 'number',
        description: 'Suggested number of carousel slides.',
        required: false,
      },
      {
        name: 'suggestedLength',
        type: 'string',
        description: 'Suggested length for text content.',
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => (
      <CreationOptionsCard
        args={args as Record<string, any>}
        status={status}
        respond={respond}
      />
    ),
  });

  // contentPresentationTool is the only structured artifact action exposed to
  // the model. The old showContentIdeas/showCarouselPreview aliases were
  // retained as no-op actions before, but their presence let the provider
  // choose two rendering paths for the same result.
  useCopilotAction({
    name: 'contentPresentationTool',
    available: 'frontend',
    render: ({ args, status }) => (
      <ContentPresentationAction
        args={args as Record<string, any>}
        status={status}
        onAction={dispatchArtifactAction}
      />
    ),
  });

  return (
      <div
        style={
          {
            '--copilot-kit-primary-color': 'var(--new-btn-text)',
            '--copilot-kit-background-color': 'var(--new-bg-color)',
          } as CopilotKitCSSProperties
        }
        className="trz agent bg-newBgColorInner flex h-full min-h-0 w-full flex-1 flex-col gap-[15px] transition-all items-center relative"
      >
        {chatError && (
          <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-xs leading-5 text-amber-100">
            <span>
              {chatError === 'credits'
                ? 'Você está sem créditos para continuar. Consulte seu saldo e escolha um plano para voltar a criar.'
                : 'O chat nao conseguiu conectar ao provedor de IA. Verifique a configuracao do backend e tente novamente.'}
            </span>
            <div className="flex shrink-0 gap-2">
              {chatError === 'credits' && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/billing';
                  }}
                  className="rounded-lg bg-amber-100/15 px-2 py-1 font-semibold text-amber-100"
                >
                  Ver créditos
                </button>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-amber-100/15 px-2 py-1 font-semibold text-amber-100"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => setChatError(null)}
                className="rounded-lg border border-amber-100/20 px-2 py-1 text-amber-100/80"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
        {actionStatus && (
          <div className="cf-studio__action-status" role="status" aria-live="polite">
            {actionStatus === 'transform-carousel'
              ? 'Gerando a copy completa com as opções escolhidas…'
              : actionStatus === 'generate-image'
                ? 'Preparando as opções para criar a imagem…'
                : 'Preparando o próximo passo…'}
          </div>
        )}
        <div className="absolute inset-0 box-border h-full w-full pb-[20px]">
          <CopilotChat
            className="w-full h-full"
            labels={{
              title: t('your_assistant', 'ContentFlow AI'),
              initial: t('agent_welcome_message', 'Ola! Eu sou o ContentFlow AI.\n\nPosso transformar uma ideia em ideias, roteiros, carrosseis, imagens, videos e publicacoes. Escreva como voce falaria com uma pessoa.\n\nAntes de gerar algo que consuma creditos, eu mostro o plano e peco sua confirmacao.'), /*
                'agent_welcome_message',
                `Hello, I am your ContentFlow agent 🙌🏻.

I can schedule a post or multiple posts to multiple channels and generate pictures and videos.

You can select the channels you want to use from the left menu.

You can see your previous conversations from the right menu.

You can also use me as an MCP Server, check Settings >> Public API
`
              */
            }}
            UserMessage={Message}
            AssistantMessage={StudioAssistantMessageWithAction}
            Input={NewInput}
            onError={(errorEvent) => {
              setChatError(classifyChatError(errorEvent));
            }}
          />
        </div>
      </div>
  );
};

const AgentChatContent: FC = () => {
  const { backendUrl } = useVariables();
  const params = useParams<{ id: string }>();
  const { properties: contextProperties } = useContext(PropertiesContext);
  const properties = Array.isArray(contextProperties) ? contextProperties : [];

  return (
    <CopilotKit
      {...(params.id === 'new' ? {} : { threadId: params.id })}
      credentials="include"
      runtimeUrl={backendUrl + '/copilot/agent'}
      showDevConsole={false}
      // Studio talks to its own Mastra agent (see docs/studio-audit.md, item
      // C4) - same instructions as 'contentflow', but with the 40-operation
      // creativeEngineTool split into 6 smaller tools. 'contentflow' itself
      // stays reserved for MCP (external API clients), untouched.
      agent="contentflow-studio"
      properties={{
        integrations: properties,
      }}
    >
      <Hooks />
      <LoadMessages id={params.id} />
      <StudioChat />
    </CopilotKit>
  );
};

class AgentChatErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AgentChat] render crash', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center text-white">
          <h2 className="text-base font-semibold">Algo inesperado aconteceu no chat</h2>
          <p className="max-w-md text-sm leading-6 text-white/60">
            Recarregue para continuar. Sua conversa fica salva — nada foi perdido.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-cyan-300"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AgentChatFallback: FC<{ loading?: boolean }> = ({ loading = false }) => (
  <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center text-white">
    <h2 className="text-base font-semibold">
      {loading ? 'Conectando ao chat...' : 'O chat esta temporariamente indisponivel'}
    </h2>
    <p className="max-w-md text-sm leading-6 text-white/60">
      {loading
        ? 'Estamos verificando a disponibilidade do backend.'
        : 'Configure o provedor de IA no backend ou tente novamente em alguns instantes.'}
    </p>
    {!loading && (
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-cyan-300"
      >
        Tentar novamente
      </button>
    )}
  </div>
);

const AgentChatGate: FC = () => {
  const apiFetch = useFetch();
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let active = true;
    apiFetch('/copilot/status')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        if (active) setState(data?.chatAvailable ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (active) setState('unavailable');
      });
    return () => {
      active = false;
    };
  }, [apiFetch]);

  if (state === 'loading') return <AgentChatFallback loading />;
  if (state === 'unavailable') return <AgentChatFallback />;

  return (
    <AgentChatErrorBoundary>
      <AgentChatContent />
    </AgentChatErrorBoundary>
  );
};

export const AgentChat: FC = () => <AgentChatGate />;

const parseBalancedJsonAt = (content: string, objectStart: number) => {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = objectStart; index < content.length; index += 1) {
    const char = content[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const raw = content.slice(objectStart, index + 1);
        try {
          return { raw, value: JSON.parse(raw) as Record<string, any> };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const findPresentationPayload = (value: unknown): Record<string, any> | null => {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPresentationPayload(item);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, any>;
  const candidate =
    record.args && typeof record.args === 'object'
      ? record.args
      : record.functionCall?.args && typeof record.functionCall.args === 'object'
        ? record.functionCall.args
        : record;
  if (candidate.operation === 'ideas' && Array.isArray(candidate.ideas)) return candidate;
  if (candidate.operation === 'carousel' && Array.isArray(candidate.slides)) return candidate;
  for (const child of Object.values(record)) {
    const found = findPresentationPayload(child);
    if (found) return found;
  }
  return null;
};

const extractTransportArtifact = (content: string) => {
  const normalized = content.replace(/\\"/g, '"');
  const formatStart = normalized.search(/\{\s*"format"\s*:\s*2\s*,\s*"parts"\s*:/);
  if (formatStart < 0) return null;
  const parsed = parseBalancedJsonAt(normalized, formatStart);
  if (!parsed || parsed.value.format !== 2 || !Array.isArray(parsed.value.parts)) return null;
  const payload = findPresentationPayload(parsed.value);
  if (!payload) return { sourceStart: formatStart, end: formatStart + parsed.raw.length, parsed: null };
  return {
    sourceStart: formatStart,
    end: formatStart + parsed.raw.length,
    parsed: { ...payload, operation: payload.operation || (payload.ideas ? 'ideas' : 'carousel') },
  };
};

const stripTransportEnvelope = (content: string) => {
  const artifact = extractTransportArtifact(content);
  if (!artifact) return content;
  return `${content.slice(0, artifact.sourceStart)}${content.slice(artifact.end)}`.trim();
};

const extractStructuredPresentedArtifact = (content: string) => {
  const normalized = content.replace(/\\"/g, '"').replace(/\\\\n/g, '\n');
  const operationStart = normalized.indexOf('{"operation"');
  const functionStart = normalized.indexOf('{"functionCall"');
  const toolNameStart = normalized.indexOf('"toolName"');
  const toolArgsLabelStart = toolNameStart >= 0 ? normalized.indexOf('"args"', toolNameStart) : -1;
  const toolArgsStart = toolArgsLabelStart >= 0 ? normalized.indexOf('{', toolArgsLabelStart) : -1;
  const starts = [operationStart, functionStart, toolArgsStart].filter((value) => value >= 0).sort((a, b) => a - b);
  const start = starts[0] ?? -1;
  if (start < 0) return null;
  const sourceStart = toolNameStart >= 0 ? Math.max(0, content.lastIndexOf('{', toolNameStart)) : [
    content.indexOf('{"operation"'),
    content.indexOf('{\\"operation\\"'),
    content.indexOf('{"functionCall"'),
    content.indexOf('{\\"functionCall\\"'),
  ].filter((value) => value >= 0).sort((a, b) => a - b)[0] ?? 0;

  const parseObjectAt = (objectStart: number) => {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = objectStart; index < normalized.length; index += 1) {
      const char = normalized[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          const raw = normalized.slice(objectStart, index + 1);
          try {
            return { raw, value: JSON.parse(raw) };
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  };

  const parsedObject = parseObjectAt(start);
  const parsedArgs = parsedObject?.value?.functionCall?.args || parsedObject?.value;
  const parsedOperation = parsedArgs?.operation ||
    (Array.isArray(parsedArgs?.ideas) ? 'ideas' : Array.isArray(parsedArgs?.slides) ? 'carousel' : '');
  if (parsedObject && (parsedOperation === 'ideas' || parsedOperation === 'carousel')) {
    return { raw: parsedObject.raw, sourceStart, parsed: { ...parsedArgs, operation: parsedOperation } };
  }

  // Some providers append presentation metadata inside the array and omit the
  // final closing brackets. Recover each balanced card for a usable fallback.
  const ideasStart = normalized.indexOf('"ideas"', start);
  const slidesStart = normalized.indexOf('"slides"', start);
  const listKey = ideasStart >= 0 && (slidesStart < 0 || ideasStart < slidesStart) ? 'ideas' : 'slides';
  const listStart = normalized.indexOf('[', listKey === 'ideas' ? ideasStart : slidesStart);
  if (listStart < 0) return null;
  const recovered: any[] = [];
  let cursor = listStart + 1;
  let metadata: any = null;
  const noteStart = normalized.indexOf('Este resultado', start);
  while (cursor < normalized.length) {
    const objectStart = normalized.indexOf('{', cursor);
    if (objectStart < 0 || (noteStart >= 0 && objectStart >= noteStart)) break;
    const object = parseObjectAt(objectStart);
    if (!object) break;
    if (object.value?.operation === 'ideas' || object.value?.operation === 'carousel') metadata = object.value;
    else if (object.value?.title || object.value?.headline || object.value?.imagePrompt) recovered.push(object.value);
    cursor = objectStart + object.raw.length;
  }
  if (!recovered.length) return null;
  const operation = listKey === 'ideas' ? 'ideas' : 'carousel';
  return {
    raw: normalized.slice(start, Math.max(cursor, listStart)),
    sourceStart,
    parsed: { ...(metadata || {}), operation, [listKey]: recovered },
  };
};

const cleanIdeaLine = (line: unknown) =>
  String(line ?? '')
    .trim()
    .replace(/^[-*•]\s*/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .trim();

const extractLooseIdeasArtifactSafe = (content: string) => {
  const source = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  // `normalized` used to end with a `.replace(/\u00c3./g, 'a')` mojibake repair
  // (here and in the two functions below). It never once fired: decomposing
  // a precomposed "\u00c3" (U+00C3) via NFD splits it into "A" + a combining
  // tilde, which the strip above already removes, so there is never an "\u00c3"
  // left for that regex to match by the time it would run. Confirmed dead
  // code, not a working repair - removed.
  const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matches = Array.from(normalized.matchAll(/formato\s*:/gi));
  if (!matches.length) return null;
  const readField = (block: string, labels: string) => {
    const match = block.match(new RegExp(`${labels}[^:]*: *(.+)`, 'i'));
    return match ? cleanIdeaLine(match[1]) : '';
  };
  const ideas: ContentIdea[] = [];
  let firstTitleIndex = -1;
  matches.forEach((match, index) => {
    const start = match.index ?? -1;
    if (start < 0) return;
    const previousStart = index > 0 ? matches[index - 1].index ?? 0 : 0;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
    const block = normalized.slice(previousStart, nextStart);
    const titleCandidates = Array.from(source.slice(previousStart, start).matchAll(/\*\*([^*]+)\*\*/g))
      .map((item) => cleanIdeaLine(item[1]))
      .filter((line) => line && !/:/.test(line) && !/^(plataforma|formato|angulo|hook|gancho|objetivo|cta|dor do publico)/i.test(line));
    const title = (titleCandidates.at(-1) || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    const idea = {
      title,
      platform: readField(block, 'plataforma') || 'Instagram',
      format: readField(block, 'formato'),
      hook: readField(block, 'gancho|hook'),
      angle: readField(block, 'angulo'),
      objective: readField(block, 'objetivo') || 'Engajamento e autoridade',
      suggestedCta: readField(block, 'chamada para acao|cta'),
    };
    if (idea.title && idea.format && idea.hook && idea.angle && idea.suggestedCta) {
      ideas.push(idea);
      if (firstTitleIndex < 0) firstTitleIndex = content.indexOf(idea.title);
    }
  });
  if (!ideas.length || firstTitleIndex < 0) return null;
  return { raw: source.slice(firstTitleIndex), sourceStart: firstTitleIndex, parsed: { operation: 'ideas', title: `${ideas.length} ideias prontas para usar`, ideas } };
};

const extractTitleIdeasArtifact = (content: string) => {
  const source = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const titleMatches = Array.from(source.matchAll(/^\s*\*\*([^*\n:]+)\*\*(?:\s*\(([^)\n]+)\))?\s*$/gm));
  if (!titleMatches.length) return null;
  const readField = (block: string, labels: string) => {
    const match = block.match(new RegExp(`${labels}[^:]*: *(.+)`, 'i'));
    return match ? cleanIdeaLine(match[1]).replace(/^\*+\s*/, '').replace(/\*+$/, '').trim() : '';
  };
  const ideas: ContentIdea[] = [];
  titleMatches.forEach((match, index) => {
    const start = match.index ?? -1;
    if (start < 0) return;
    const end = index + 1 < titleMatches.length ? titleMatches[index + 1].index ?? source.length : source.length;
    const block = normalized.slice(start + match[0].length, end);
    const idea = {
      title: cleanIdeaLine(match[1]),
      platform: match[2] || readField(block, 'plataforma') || 'Instagram',
      format: readField(block, 'formato'),
      hook: readField(block, 'gancho|hook'),
      angle: readField(block, 'angulo'),
      objective: readField(block, 'objetivo') || 'Engajamento e autoridade',
      suggestedCta: readField(block, 'chamada para acao|cta'),
    };
    if (idea.title && idea.format && idea.hook && idea.angle && idea.suggestedCta) ideas.push(idea);
  });
  if (!ideas.length) return null;
  return {
    raw: source.slice(titleMatches[0].index ?? 0),
    sourceStart: titleMatches[0].index ?? 0,
    parsed: { operation: 'ideas', title: `${ideas.length} ideias prontas para usar`, ideas },
  };
};

const extractSequenceIdeasArtifact = (content: string) => {
  const source = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matches = Array.from(normalized.matchAll(/angulo\s*:/gi));
  if (!matches.length) return null;
  const readField = (block: string, labels: string) => {
    const match = block.match(new RegExp(`${labels}[^:]*: *(.+)`, 'i'));
    return match ? cleanIdeaLine(match[1]).replace(/^\*+\s*/, '').replace(/\*+$/, '').trim() : '';
  };
  const ideas: ContentIdea[] = [];
  let firstTitleIndex = -1;
  matches.forEach((match, index) => {
    const angleStart = match.index ?? -1;
    if (angleStart < 0) return;
    const previousStart = index > 0 ? (matches[index - 1].index ?? 0) + matches[index - 1][0].length : 0;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
    const block = normalized.slice(previousStart, nextStart);
    const title = source
      .slice(previousStart, angleStart)
      .split(/\r?\n/)
      .map(cleanIdeaLine)
      .filter((line) => line && !/:/.test(line) && !/^['"“”*]/.test(line) && !/^aqui estao|^aqui estão/i.test(line))
      .at(-1) || '';
    const idea = {
      title: title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      platform: readField(block, 'plataforma') || 'Instagram',
      format: readField(block, 'formato') || 'Post para redes sociais',
      hook: readField(block, 'gancho|hook') || title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      angle: readField(block, 'angulo') || 'Conteúdo prático e relevante para o público da marca.',
      objective: readField(block, 'objetivo') || 'Engajamento e autoridade',
      suggestedCta: readField(block, 'chamada para acao|cta') || 'Salve este conteúdo para consultar depois.',
    };
    if (idea.title) {
      ideas.push(idea);
      if (firstTitleIndex < 0) firstTitleIndex = content.indexOf(idea.title);
    }
  });
  if (!ideas.length || firstTitleIndex < 0) return null;
  return { raw: source.slice(firstTitleIndex), sourceStart: firstTitleIndex, parsed: { operation: 'ideas', title: `${ideas.length} ideias prontas para usar`, ideas } };
};

const extractPresentedArtifact = (content: string) => {
  const visibleContent = stripTransportEnvelope(content);
  const visibleArtifact = extractSequenceIdeasArtifact(visibleContent) || extractTitleIdeasArtifact(visibleContent) || extractLooseIdeasArtifactSafe(visibleContent);
  if (visibleArtifact) return visibleArtifact;
  const transport = extractTransportArtifact(content);
  if (transport?.parsed) {
    return {
      raw: content.slice(transport.sourceStart, transport.end),
      sourceStart: transport.sourceStart,
      parsed: transport.parsed,
    };
  }
  const structured = extractStructuredPresentedArtifact(visibleContent);
  return structured || extractSummaryIdeasArtifact(visibleContent);
};

const getAssistantContent = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!value) return '';
  if (Array.isArray(value)) {
    return value
      .map((part) => getAssistantContent(part))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    if (typeof record.content === 'string') return record.content;
    if (Array.isArray(record.parts)) return getAssistantContent(record.parts);
    return JSON.stringify(value);
  }
  return String(value);
};

const StudioAssistantMessage: FC<AssistantMessageProps & { onAction?: (value: Record<string, unknown>) => void }> = (props) => {
  const content = getAssistantContent(props.message?.content);
  const visibleSource = useMemo(() => stripTransportEnvelope(content), [content]);
  const presentedArtifact = useMemo(() => extractPresentedArtifact(content) || extractPresentedArtifact(visibleSource), [content, visibleSource]);
  const renderSource = presentedArtifact?.sourceStart === 0 && visibleSource !== content ? visibleSource : content;
  const displayContent = (presentedArtifact
    ? `${renderSource.slice(0, presentedArtifact.sourceStart).replace(/(?:```)?json\s*$/i, '').trim()}\n\n${renderSource.slice(renderSource.indexOf('Este resultado', presentedArtifact.sourceStart) >= 0 ? renderSource.indexOf('Este resultado', presentedArtifact.sourceStart) : renderSource.length)}`
    : visibleSource)
    .replace(/```?json\s*/gi, '')
    .replace(/\[--content-action--\][\s\S]*?\[--content-action--\]/g, '')
    .replace(/^\s*\{"format"\s*:\s*2[\s\S]*?\}\s*/g, '')
    .replace(/^\s*\*\*\s*$/gm, '')
    .trim();
  const displayProps = ({
    ...props,
    message: { ...props.message, content: displayContent },
  } as AssistantMessageProps);
  const textFallbackArtifact = presentedArtifact && 'renderFromText' in presentedArtifact && presentedArtifact.renderFromText
    ? presentedArtifact.parsed
    : null;
  // Only render the text-fallback card if no other path (the structured tool
  // result, or an earlier message with identical content) already owns it.
  // Keyed by message id so re-renders of this same message keep the card while
  // duplicate messages/retries suppress it.
  const fallbackSignature = textFallbackArtifact
    ? artifactSignature(textFallbackArtifact.operation, textFallbackArtifact)
    : '';
  const canRenderFallback =
    !props.isLoading &&
    !!textFallbackArtifact &&
    claimArtifactCard(fallbackSignature, `text:${props.message?.id || fallbackSignature}`);
  return (
    <div
      className="cf-studio__assistant-message"
      aria-live="polite"
      data-loading={props.isLoading ? 'true' : 'false'}
    >
      <DefaultAssistantMessage {...displayProps} />
      {canRenderFallback && textFallbackArtifact?.operation === 'ideas' && textFallbackArtifact.ideas?.length > 0 && (
        <CardErrorBoundary label="ideas card (fallback)">
          <ContentIdeasCard args={textFallbackArtifact} onAction={props.onAction} />
        </CardErrorBoundary>
      )}
      {canRenderFallback && textFallbackArtifact?.operation === 'carousel' && textFallbackArtifact.slides?.length > 0 && (
        <CardErrorBoundary label="carousel card (fallback)">
          <CarouselPreviewCard args={textFallbackArtifact} onAction={props.onAction} />
        </CardErrorBoundary>
      )}
    </div>
  );
};

// CopilotChat's `AssistantMessage` prop must stay referentially stable.
// Passing an inline arrow function (as this used to) hands CopilotChat a new
// component *type* on every render of StudioChat, which forces it to
// remount every assistant-message subtree it manages. In production this
// compounded into an unbounded, ever-growing pile of leftover
// `.cf-studio__assistant-message` nodes (thousands, still climbing) instead
// of being cleanly replaced — the artifact cards inside them stopped
// receiving clicks because the instance they were bound to kept getting
// discarded before a state update could render. `dispatchArtifactAction` is
// already a stable module-level function, so this wrapper only needs to be
// declared once.
const StudioAssistantMessageWithAction: FC<AssistantMessageProps> = (messageProps) => (
  // Per-message isolation: StudioAssistantMessage runs fragile string parsing
  // and card extraction in its own body, so a single malformed message must not
  // be allowed to throw up to the chat-wide boundary and blank the studio. On a
  // crash here, that one message degrades to the inline notice and every other
  // message keeps rendering. `fallback={null}` keeps a purely-decorative failure
  // silent rather than stamping a notice on an otherwise fine text reply.
  <CardErrorBoundary label="assistant message" fallback={null}>
    <StudioAssistantMessage {...messageProps} onAction={dispatchArtifactAction} />
  </CardErrorBoundary>
);

// Studio artifact cards are generative UI: they are drawn live by an action's
// `render` during the run, not stored as HTML. On reload the thread comes back
// as Mastra messages (text + tool invocations). To bring the cards back we
// replay the tool call as a CopilotKit ActionExecutionMessage + ResultMessage,
// so the same `render` path fires again. We only replay tools that produce a
// durable, non-interactive card — never render-and-wait actions such as
// showCreationOptions/manualPosting, which would re-open a prompt on load.
const REHYDRATABLE_ACTIONS = new Set(['contentPresentationTool']);

type RecalledToolInvocation = {
  state?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, any>;
  result?: unknown;
};

const collectToolInvocations = (content: any): RecalledToolInvocation[] => {
  const invocations: RecalledToolInvocation[] = [];
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  for (const part of parts) {
    if (part?.type === 'tool-invocation' && part.toolInvocation) {
      invocations.push(part.toolInvocation as RecalledToolInvocation);
    }
  }
  if (!invocations.length && Array.isArray(content?.toolInvocations)) {
    for (const invocation of content.toolInvocations) {
      invocations.push(invocation as RecalledToolInvocation);
    }
  }
  return invocations;
};

const collectText = (content: any): string => {
  if (typeof content === 'string') return content;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const textFromParts = parts
    .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('\n')
    .trim();
  if (textFromParts) return textFromParts;
  if (typeof content?.content === 'string') return content.content;
  return '';
};

const rebuildMessages = (recalled: any[]) => {
  const messages: Array<TextMessage | ActionExecutionMessage | ResultMessage> = [];
  for (const entry of recalled) {
    try {
      const text = collectText(entry?.content);
      if (text) {
        messages.push(new TextMessage({ id: entry.id || makeId(10), content: text, role: entry.role }));
      }
      const invocations = collectToolInvocations(entry?.content).filter(
        (invocation) => REHYDRATABLE_ACTIONS.has(String(invocation.toolName))
      );
      for (const invocation of invocations) {
        // Prefer the stored tool result (it holds the server-normalized ideas /
        // slides) and fall back to the raw call args. resolveContentPresentation
        // understands both the `{ result: {...} }` and the bare-payload shapes.
        const renderArgs = (invocation.result ?? invocation.args ?? {}) as Record<string, any>;
        if (!renderArgs || typeof renderArgs !== 'object') continue;
        const callId = invocation.toolCallId || makeId(12);
        messages.push(
          new ActionExecutionMessage({
            id: callId,
            name: String(invocation.toolName),
            arguments: renderArgs,
          })
        );
        // A result marks the action complete; without it the card would be
        // treated as still in-progress and suppressed.
        messages.push(
          new ResultMessage({
            id: `${callId}-result`,
            actionExecutionId: callId,
            actionName: String(invocation.toolName),
            result: ResultMessage.encodeResult(invocation.result ?? { acknowledged: true }),
          })
        );
      }
    } catch (error) {
      console.error('Failed to rebuild studio message', error);
    }
  }
  return messages;
};

const LoadMessages: FC<{ id: string }> = ({ id }) => {
  const { setMessages } = useCopilotMessagesContext();
  const fetch = useFetch();
  const loadMessages = useCallback(async (idToSet: string) => {
    try {
      const response = await fetch(`/copilot/${idToSet}/list`);
      if (!response.ok) throw new Error(`Failed to load messages: ${response.status}`);
      const data = await response.json();
      setMessages(rebuildMessages(Array.isArray(data?.messages) ? data.messages : []));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  useEffect(() => {
    // Clear the per-thread card ownership so switching conversations never
    // suppresses a card that legitimately belongs to the newly opened thread.
    resetArtifactCardOwners();
    if (id === 'new') {
      setMessages([]);
      return;
    }
    loadMessages(id);
  }, [id]);

  return null;
};

const Message: FC<UserMessageProps> = (props) => {
  const convertContentToImagesAndVideo = useMemo(() => {
    return (props.message?.content || '')
      .replace(/Video: (http.*mp4\n)/g, (match, p1) => {
        return `<video controls class="h-[150px] w-[150px] rounded-[8px] mb-[10px]"><source src="${p1.trim()}" type="video/mp4">Your browser does not support the video tag.</video>`;
      })
      .replace(/Image: (http.*\n)/g, (match, p1) => {
        return `<img src="${p1.trim()}" alt="Generated image" class="h-[150px] w-[150px] max-w-full border border-newBgColorInner" />`;
      })
      .replace(/\[\-\-Media\-\-\](.*)\[\-\-Media\-\-\]/g, (match, p1) => {
        return `<div class="flex justify-center mt-[20px]">${p1}</div>`;
      })
      .replace(
        /(\[--integrations--\][\s\S]*?\[--integrations--\])/g,
        (match, p1) => {
          return ``;
        }
      )
      .replace(
        /(\[--creation-options--\][\s\S]*?\[--creation-options--\])/g,
        () => ``
      )
      .replace(
        /(\[--contentflow-intent--\][\s\S]*?\[--contentflow-intent--\])/g,
        () => ``
      )
      .replace(
        /(\[--content-action--\][\s\S]*?\[--content-action--\])/g,
        () => ``
      );
  }, [props.message?.content]);
  return (
    <div
      className="copilotKitMessage copilotKitUserMessage min-w-[300px]"
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(convertContentToImagesAndVideo),
      }}
    />
  );
};

// Intent classification deliberately lives in the agent, not here. This
// composer used to keyword-match the message before the model ever saw it:
// one regex forced the ideas artifact by injecting a [--contentflow-intent--]
// block, another opened the creation configurator locally without consulting
// the model at all. Those regexes decided the whole experience and were wrong
// often enough to read as "the chat does not understand me" - "me de 2
// ideias" matched only because its "de" collided with the verb list, while
// "me da 2 ideias", "2 ideias" or "quero ideias" silently fell through to
// plain prose. The agent already owns every tool those branches were
// simulating (contentPresentationTool, showCreationOptions, the generation
// tools) and its instructions now route intent explicitly, so the composer
// just sends what the user actually typed.

const NewInput: FC<InputProps> = (props) => {
  // Expose the input's send channel so artifact buttons can reuse it.
  const onSend = props.onSend;
  useEffect(() => {
    liveSendMessage.current = (text: string) => Promise.resolve(onSend(text));
    return () => {
      liveSendMessage.current = null;
    };
  }, [onSend]);

  const [media, setMedia] = useState([] as { path: string; id: string }[]);
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState(
    [] as { filename: string; storageUrl: string; mimeType?: string; size?: number }[]
  );
  const [attachmentError, setAttachmentError] = useState('');
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const apiFetch = useFetch();
  const params = useParams<{ id: string }>();
  const { properties } = useContext(PropertiesContext);

  const registerAttachment = async (file: File) => {
    setAttachmentError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await apiFetch('/media/upload-simple', {
        method: 'POST',
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploaded = await uploadResponse.json();
      const storageUrl = uploaded?.path || uploaded?.url;
      if (!storageUrl) throw new Error('Upload did not return a URL');
      const attachment = {
        filename: file.name,
        storageUrl,
        mimeType: file.type || undefined,
        size: file.size,
      };
      setAttachments((current) => [...current, attachment]);
      if (params.id && params.id !== 'new') {
        await apiFetch('/studio/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...attachment, threadId: params.id, kind: 'FILE' }),
        });
      }
    } catch {
      setAttachmentError('Nao foi possivel anexar esse arquivo.');
    } finally {
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const submitToAgent = async (text: string) => {
    const links = Array.from(text.matchAll(/https?:\/\/[^\s)]+/gi)).map(
      (match) => match[0]
    );
    if (params.id && params.id !== 'new') {
      await Promise.allSettled(
        links
          .filter((storageUrl) => storageUrl.startsWith('https://'))
          .map((storageUrl) =>
            apiFetch('/studio/attachments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                threadId: params.id,
                kind: 'LINK',
                filename: storageUrl,
                storageUrl,
              }),
            })
          )
      );
    }
    const send = props.onSend(
      text +
        (media.length > 0
          ? '\n[--Media--]' +
            media
              .map((m) =>
                m.path.indexOf('mp4') > -1
                  ? `Video: ${m.path}`
                  : `Image: ${m.path}`
              )
              .join('\n') +
            '\n[--Media--]'
          : '') +
        (attachments.length > 0
          ? '\n[--Attachments--]\n' +
            attachments
              .map((attachment) => `${attachment.filename}: ${attachment.storageUrl}`)
              .join('\n') +
            '\n[--Attachments--]'
          : '') +
        `
${
  properties.length
    ? `[--integrations--]
Use the following social media platforms: ${JSON.stringify(
        properties.map((p) => ({
          id: p.id,
          platform: p.identifier,
          profilePicture: p.picture,
          additionalSettings: p.additionalSettings,
        }))
      )}
[--integrations--]`
    : ``
}`
    );
    await send;
    setValue('');
    setMedia([]);
    setAttachments([]);
    return send;
  };

  return (
    <>
      <div className="cf-studio__composer-tools">
        <MediaPortal
          value={value}
          media={media}
          setMedia={(e) => setMedia(e.target.value)}
        />
        <div className="cf-studio__attachment-bar flex items-center gap-2 text-[11px] text-white/45">
          <input
            ref={attachmentInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.json,.csv,.md"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void registerAttachment(file);
            }}
          />
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="cf-studio__attachment-button"
          >
            <svg
              className="cf-studio__attachment-icon"
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 1.75h5.25L12.5 5v9.25H4V1.75Z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9 1.75V5h3.5M6 8h4.5M6 10.5h4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Anexar PDF ou documento
          </button>
          {attachments.length > 0 && <span>{attachments.length} anexo(s) pronto(s)</span>}
          {attachmentError && <span className="text-rose-300">{attachmentError}</span>}
        </div>
      </div>
      {/* The creation configurator is rendered by the agent's own
          showCreationOptions action (see AgentChatContent above), so it appears
          only when the model actually decides a configurator is the right next
          step - not because the composer guessed from keywords. */}
      <Input
        {...props}
        onChange={setValue}
        onSend={async (text) => submitToAgent(text)}
      />
    </>
  );
};

export const Hooks: FC = () => {
  const modals = useModals();

  useCopilotAction({
    name: 'manualPosting',
    description:
      'This tool should be triggered when the user wants to manually add the generated post',
    parameters: [
      {
        name: 'list',
        type: 'object[]',
        description:
          'list of posts to schedule to different social media (integration ids)',
        attributes: [
          {
            name: 'integrationId',
            type: 'string',
            description: 'The integration id',
          },
          {
            name: 'date',
            type: 'string',
            description: 'UTC date of the scheduled post',
          },
          {
            name: 'settings',
            type: 'object',
            description: 'Settings for the integration [input:settings]',
          },
          {
            name: 'posts',
            type: 'object[]',
            description: 'list of posts / comments (one under another)',
            attributes: [
              {
                name: 'content',
                type: 'string',
                description: 'the content of the post',
              },
              {
                name: 'attachments',
                type: 'object[]',
                description: 'list of attachments',
                attributes: [
                  {
                    name: 'id',
                    type: 'string',
                    description: 'id of the attachment',
                  },
                  {
                    name: 'path',
                    type: 'string',
                    description: 'url of the attachment',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => {
      if (status === 'executing') {
        return <OpenModal args={args} respond={respond} />;
      }

      return null;
    },
  });
  return null;
};

const OpenModal: FC<{
  respond: (value: any) => void;
  args: {
    list: {
      integrationId: string;
      date: string;
      settings?: Record<string, any>;
      posts: { content: string; attachments: { id: string; path: string }[] }[];
    }[];
  };
}> = ({ args, respond }) => {
  const modals = useModals();
  const { properties } = useContext(PropertiesContext);
  const startModal = useCallback(async () => {
    for (const integration of args.list) {
      await new Promise((res) => {
        const group = makeId(10);
        modals.openModal({
          id: 'add-edit-modal',
          closeOnClickOutside: false,
          removeLayout: true,
          closeOnEscape: false,
          withCloseButton: false,
          askClose: true,
          size: '80%',
          title: ``,
          classNames: {
            modal: 'w-[100%] max-w-[1400px] text-textColor',
          },
          children: (
            <ExistingDataContextProvider
              value={{
                group,
                integration: integration.integrationId,
                integrationPicture:
                  properties.find((p) => p.id === integration.integrationId)
                    .picture || '',
                settings: integration.settings || {},
                posts: integration.posts.map((p) => ({
                  approvedSubmitForOrder: 'NO',
                  content: p.content,
                  createdAt: new Date().toISOString(),
                  state: 'DRAFT',
                  id: makeId(10),
                  settings: JSON.stringify(integration.settings || {}),
                  group,
                  integrationId: integration.integrationId,
                  integration: properties.find(
                    (p) => p.id === integration.integrationId
                  ),
                  publishDate: dayjs.utc(integration.date).toISOString(),
                  image: p.attachments.map((a) => ({
                    id: a.id,
                    path: a.path,
                  })),
                })),
              }}
            >
              <AddEditModal
                date={dayjs.utc(integration.date)}
                allIntegrations={properties}
                integrations={properties.filter(
                  (p) => p.id === integration.integrationId
                )}
                onlyValues={integration.posts.map((p) => ({
                  content: p.content,
                  id: makeId(10),
                  settings: integration.settings || {},
                  image: p.attachments.map((a) => ({
                    id: a.id,
                    path: a.path,
                  })),
                }))}
                reopenModal={() => {}}
                mutate={() => res(true)}
              />
            </ExistingDataContextProvider>
          ),
        });
      });
    }

    respond('User scheduled all the posts');
  }, [args, respond, properties]);

  useEffect(() => {
    startModal();
  }, []);
  return (
    <div onClick={() => respond('continue')}>
      Opening manually ${JSON.stringify(args)}
    </div>
  );
};
