'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
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
      <h1
        style={{
          fontSize: 96,
          fontWeight: 700,
          color: '#b4530a',
          marginBottom: 8,
          lineHeight: 1,
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        Página não encontrada
      </h2>
      <p
        style={{
          fontSize: 16,
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: 32,
          maxWidth: 480,
        }}
      >
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/"
        style={{
          padding: '12px 32px',
          backgroundColor: '#b4530a',
          color: '#ffffff',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5024B8')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#b4530a')}
      >
        Voltar ao início
      </Link>
    </div>
  );
}
