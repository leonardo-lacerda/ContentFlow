import type { ReactNode } from 'react';

export const metadata = {
  title: 'ContentFlow — Crie carrosséis, imagens e vídeos UGC pelo chat',
  description:
    'Converse com a IA para criar ideias, copy, carrosséis, imagens e vídeos UGC. Revise, edite o design e publique com a sua identidade.',
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <link
        href="https://cdn.jsdelivr.net/fontsource/css/anton@latest/index.css"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/fontsource/css/schibsted-grotesk@latest/index.css"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/fontsource/css/space-mono@latest/index.css"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/landing-styles.css" />
      <link rel="stylesheet" href="/landing-current.css" />
      <div className="landing-root">{children}</div>
    </>
  );
}
