// Global test setup for the frontend vitest suite.

// jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.) for
// component-level specs — auto-extends vitest's `expect`.
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia; @copilotkit/react-ui's dark-mode
// detection calls it unconditionally on mount.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);
}

export {};
