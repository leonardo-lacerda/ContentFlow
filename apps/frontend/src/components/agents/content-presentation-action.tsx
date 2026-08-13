'use client';

import type { FC } from 'react';
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
  const presentation = resolveContentPresentation(args, status);
  if (!presentation) return null;
  // The structured tool result is the canonical card; take over the signature
  // so any text-fallback render of the same ideas/slides suppresses itself.
  const signature = artifactSignature(presentation.operation, presentation.payload);
  claimArtifactCard(signature, `structured:${signature}`, true);
  if (presentation.operation === 'ideas') {
    return <ContentIdeasCard args={presentation.payload} onAction={onAction} />;
  }
  if (presentation.operation === 'carousel') {
    return <CarouselPreviewCard args={presentation.payload} onAction={onAction} />;
  }
  return null;
};
