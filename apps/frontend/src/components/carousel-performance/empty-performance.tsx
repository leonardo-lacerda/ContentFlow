'use client';

import { EmptyState } from '@gitroom/frontend/components/new-layout/page-system';

export function EmptyPerformance({ onCollect }: { onCollect?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 19V5M4 19H20M8 16V11M12 16V8M16 16V13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
      title="Nenhum dado de performance ainda"
      description="Os dados de performance dos carrosséis aparecerão aqui assim que as métricas forem coletadas das plataformas de publicação."
      actionLabel={onCollect ? 'Coletar métricas' : undefined}
      onAction={onCollect}
    />
  );
}
