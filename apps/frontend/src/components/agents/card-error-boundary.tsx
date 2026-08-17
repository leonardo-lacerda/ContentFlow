'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  /** Short label for the thing being isolated, used in logs (e.g. "ideas card"). */
  label?: string;
  children: ReactNode;
  /** Optional custom fallback; defaults to a compact inline notice. */
  fallback?: ReactNode;
};

type State = { error: Error | null };

/**
 * Isolates a single Studio artifact (an ideas or carousel card, or one
 * assistant message) so that a render crash inside it degrades to a small
 * inline notice instead of taking down the whole chat.
 *
 * Why this exists: the Studio previously had exactly one error boundary, wrapped
 * around the entire chat. Any exception thrown while rendering a single
 * malformed card — a shape the fragile text parsers didn't expect, a null field
 * a card assumed present — blanked the ENTIRE studio and showed a misleading
 * "AI provider not configured" message. That is the structural reason a change
 * to one card's rendering could visibly break everything. Scoping the boundary
 * to each card contains the blast radius: one bad card fails alone, the rest of
 * the conversation keeps working.
 */
export class CardErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the diagnostic — this is where a real card regression surfaces.
    console.error(
      `[Studio] ${this.props.label || 'card'} failed to render`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div
          role="note"
          className="cf-studio__card-error"
          style={{
            margin: '8px 0',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,80,80,0.08)',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          Não foi possível exibir este item. O restante da conversa continua
          funcionando — peça novamente e ele será recriado.
        </div>
      );
    }
    return this.props.children;
  }
}
