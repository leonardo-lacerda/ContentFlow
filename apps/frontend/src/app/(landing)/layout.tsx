import type { ReactNode } from 'react';

export const metadata = {
  title: 'ContentFlow — Sua operação de conteúdo no piloto automático',
  description:
    'O ContentFlow aprende seu posicionamento, gera ideias no seu nicho, monta carrosséis com a sua identidade e agenda nas 5 redes. Você aprova em 10 min; a máquina roda o resto.',
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
      <div className="landing-root">{children}</div>
    </>
  );
}
