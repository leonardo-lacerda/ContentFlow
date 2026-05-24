'use client';

import { AiGenerateImagesStudioView } from './ai-generate-images-studio-view';
import { useAiGenerateImagesStudio } from './use-ai-generate-images-studio';

export const AiGenerateImagesComponent = () => {
  const studio = useAiGenerateImagesStudio();

  return <AiGenerateImagesStudioView studio={studio} />;
};
