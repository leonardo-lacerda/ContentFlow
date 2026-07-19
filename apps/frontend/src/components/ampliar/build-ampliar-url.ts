import type { AmpliarSource, AmpliarTarget } from './ampliar.types';

const PATH: Record<AmpliarTarget, string> = {
  ads: '/ads',
  email: '/email',
  video: '/video',
};

export function buildAmpliarUrl(
  target: AmpliarTarget,
  source: AmpliarSource = {}
): string {
  const params = new URLSearchParams();
  if (source.from) params.set('from', source.from);
  if (source.brandId) params.set('brandId', source.brandId);
  if (source.ideaId) params.set('ideaId', source.ideaId);
  if (source.projectId) params.set('projectId', source.projectId);
  if (source.topic) params.set('topic', source.topic);
  if (source.hook) params.set('hook', source.hook);
  if (source.angle) params.set('angle', source.angle);
  if (source.goal) params.set('goal', source.goal);
  if (source.objective) params.set('objective', source.objective);
  if (source.emailType) params.set('type', source.emailType);
  if (source.format) params.set('format', source.format);
  if (source.duration) params.set('duration', source.duration);

  const qs = params.toString();
  return qs ? `${PATH[target]}?${qs}` : PATH[target];
}
