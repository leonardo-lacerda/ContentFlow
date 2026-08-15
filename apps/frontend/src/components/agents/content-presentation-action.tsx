'use client';

import { useId, type FC } from 'react';
import {
  CarouselPreviewCard,
  ContentIdeasCard,
} from './content-artifacts.component';
import {
  artifactSignature,
  claimArtifactCard,
  resolveContentPresentation,
} from './content-presentation-payload';

type PresentationActionProps = {
  args?: Record<string, any>;
  status?: string;
  onAction?: (value: Record<string, unknown>) => void | Promise<void>;
};

export const ContentPresentationAction: FC<PresentationActionProps> = ({
  args,
  status,
  onAction,
}) => {
  // Stable per-mounted-instance id: CopilotKit renders each tool call at its
  // own fixed position in the message list, so this is a genuine identity for
  // *this* tool call — unlike deriving the owner id from the content itself,
  // which made every call with the same payload indistinguishable from one
  // another and defeated the dedup below entirely.
  const instanceId = useId();
  const presentation = resolveContentPresentation(args, status);
  if (!presentation) return null;
  // The structured tool result is the canonical card; it takes over a stale
  // text-fallback render of the same content, but yields if another
  // structured call already owns this exact signature (a genuine duplicate
  // tool call, e.g. the model re-emitting the same ideas twice).
  const signature = artifactSignature(presentation.operation, presentation.payload);
  const owned = claimArtifactCard(signature, `structured:${instanceId}`, true);
  if (!owned) return null;
  if (presentation.operation === 'ideas') {
    return <ContentIdeasCard args={presentation.payload} onAction={onAction} />;
  }
  if (presentation.operation === 'carousel') {
    return <CarouselPreviewCard args={presentation.payload} onAction={onAction} />;
  }
  return null;
};
