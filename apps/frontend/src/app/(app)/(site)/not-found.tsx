import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-[16px]">
      <div className="text-[64px]">🔍</div>
      <h2 className="text-[24px] font-[700]">Página não encontrada</h2>
      <p className="max-w-[400px] text-center text-[14px] text-textItemBlur">
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="rounded-[10px] bg-primary px-[24px] py-[10px] text-[14px] font-[600] text-white transition hover:opacity-90"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
