/**
 * Window augmentations for third-party analytics and mobile WebView APIs.
 */
interface Window {
  posthog?: {
    capture: (event: string, properties?: Record<string, unknown>) => void;
    identify: (...args: unknown[]) => void;
    [key: string]: unknown;
  };
  plausible?: (
    event: string,
    options?: { props?: Record<string, unknown> }
  ) => void;
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
}
