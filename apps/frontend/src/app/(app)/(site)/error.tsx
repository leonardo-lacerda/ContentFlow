'use client';

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-[16px]">
      <div className="text-[48px]">⚠️</div>
      <h2 className="text-[20px] font-[600]">Algo deu errado</h2>
      <p className="max-w-[400px] text-center text-[14px] text-textItemBlur">
        {error.message || 'Ocorreu um erro inesperado. Tente novamente.'}
      </p>
      <button
        onClick={reset}
        className="rounded-[10px] bg-primary px-[24px] py-[10px] text-[14px] font-[600] text-white transition hover:opacity-90"
      >
        Tentar novamente
      </button>
    </div>
  );
}
