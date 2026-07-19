'use client';

import { useEffect } from 'react';
import { PageShell, PageBody, EmptyState } from '@gitroom/frontend/components/new-layout/page-system';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <PageBody className="!p-0">
        <EmptyState
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="Algo deu errado"
          description={
            error?.message ||
            'Ocorreu um erro inesperado ao carregar esta página. Tente novamente.'
          }
          actionLabel="Tentar novamente"
          onAction={reset}
        />
      </PageBody>
    </PageShell>
  );
}
