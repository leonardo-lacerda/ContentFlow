'use client';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0B0A0A',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid rgba(97, 43, 211, 0.2)',
          borderTopColor: '#b4530a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
