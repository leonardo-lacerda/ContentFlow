'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0B0A0A',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Algo deu errado
        </h2>
        <p
          style={{
            fontSize: 16,
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: 24,
            maxWidth: 480,
          }}
        >
          {error.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '12px 32px',
            backgroundColor: '#612BD3',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5024B8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#612BD3')}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
