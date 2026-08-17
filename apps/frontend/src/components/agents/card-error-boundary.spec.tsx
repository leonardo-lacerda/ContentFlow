import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { CardErrorBoundary } from './card-error-boundary';

const Boom = (): ReactElement => {
  throw new Error('card blew up');
};

describe('CardErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error to console.error; silence it so the suite
    // output stays readable while still exercising the catch path.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children normally when they do not throw', () => {
    render(
      <CardErrorBoundary label="ideas card">
        <div>healthy card</div>
      </CardErrorBoundary>
    );
    expect(screen.getByText('healthy card')).toBeTruthy();
  });

  it('shows the inline notice instead of crashing when a card throws', () => {
    render(
      <CardErrorBoundary label="ideas card">
        <Boom />
      </CardErrorBoundary>
    );
    expect(screen.getByText(/Não foi possível exibir este item/)).toBeTruthy();
  });

  it('renders a custom fallback (including null) when provided', () => {
    const { container } = render(
      <CardErrorBoundary label="assistant message" fallback={null}>
        <Boom />
      </CardErrorBoundary>
    );
    // fallback={null} => nothing rendered, no default notice.
    expect(container.textContent).toBe('');
  });

  it('isolates a crashing card so a sibling card keeps rendering', () => {
    render(
      <div>
        <CardErrorBoundary label="bad card">
          <Boom />
        </CardErrorBoundary>
        <CardErrorBoundary label="good card">
          <div>sibling survives</div>
        </CardErrorBoundary>
      </div>
    );
    expect(screen.getByText('sibling survives')).toBeTruthy();
    expect(screen.getByText(/Não foi possível exibir este item/)).toBeTruthy();
  });
});
