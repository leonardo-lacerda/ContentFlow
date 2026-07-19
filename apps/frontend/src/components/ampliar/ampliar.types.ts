export type AmpliarTarget = 'ads' | 'email' | 'video';

export type AmpliarSource = {
  brandId?: string;
  ideaId?: string;
  projectId?: string;
  topic?: string;
  hook?: string;
  angle?: string;
  goal?: string;
  /** ads */
  objective?: string;
  /** email: WELCOME_SEQUENCE | PROMOTIONAL | NEWSLETTER */
  emailType?: string;
  /** video */
  format?: string;
  duration?: string;
  from?: 'swipe' | 'carousel' | 'studio' | 'manual' | string;
};

export type AmpliarPrefill = AmpliarSource & {
  hasSource: boolean;
};
