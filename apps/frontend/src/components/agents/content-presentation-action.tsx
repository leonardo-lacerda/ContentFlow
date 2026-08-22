'use client';

import { useId, type FC } from 'react';
import {
  CarouselPreviewCard,
  ContentIdeasCard,
} from './content-artifacts.component';
import { CardErrorBoundary } from './card-error-boundary';
import {
  artifactSignature,
  claimArtifactCard,
  resolveContentPresentation,
} from './content-presentation-payload';

type PresentationActionProps = {
  args?: Record<string, any>;
  status?: string;
  toolCallId?: string;
  onAction?: (value: Record<string, unknown>) => void | Promise<void>;
};

export const ContentPresentationAction: FC<PresentationActionProps> = ({
  args,
  status,
  toolCallId,
  onAction,
}) => {
  // CopilotKit's legacy `useCopilotAction` re-registers its `render` closure
  // (a fresh function identity) on every parent re-render — which happens on
  // every streamed token — and the AG-UI adapter uses that render function as
  // the JSX component type, so React fully unmounts/remounts this component
  // each time. A `useId()`-based owner id therefore changes several times
  // during a single tool call, defeating the ownership dedup below (only the
  // first mount's claim would stick, and it may not be the one that survives
  // to the settled DOM). `toolCallId` is injected by CopilotKit from the
  // actual AG-UI tool_call.id and is unaffected by that remount churn, so it
  // is the real stable identity for "this tool call" (confirmed by reading
  // node_modules/@copilotkit/react-core's ToolCallRenderer, which passes
  // `toolCallId: toolCall.id` into the render props even though the public
  // ActionRenderProps type omits it). `useId()` remains only as a fallback
  // for callers that don't supply it (e.g. the isolated jsdom test harness).
  const instanceId = useId();
  const ownerKey = toolCallId || instanceId;
  const presentation = resolveContentPresentation(args, status);
  if (!presentation) return null;
  // The structured tool result is the canonical card; it takes over a stale
  // text-fallback render of the same content, but yields if another
  // structured call already owns this exact signature (a genuine duplicate
  // tool call, e.g. the model re-emitting the same ideas twice).
  const signature = artifactSignature(presentation.operation, presentation.payload);
  const owned = claimArtifactCard(signature, `structured:${ownerKey}`, true);
  if (!owned) return null;
  if (presentation.operation === 'ideas') {
    return (
      <CardErrorBoundary label="ideas card">
        <ContentIdeasCard args={presentation.payload} onAction={onAction} />
      </CardErrorBoundary>
    );
  }
  if (presentation.operation === 'carousel') {
    return (
      <CardErrorBoundary label="carousel card">
        <CarouselPreviewCard args={presentation.payload} onAction={onAction} />
      </CardErrorBoundary>
    );
  }
  return null;
};
