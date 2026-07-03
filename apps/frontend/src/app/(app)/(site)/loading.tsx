export default function SiteLoading() {
  return (
    <div className="flex h-[calc(100vh-80px)] items-center justify-center">
      <div className="flex flex-col items-center gap-[16px]">
        <div className="h-[32px] w-[32px] animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-[14px] text-textItemBlur">Carregando...</p>
      </div>
    </div>
  );
}
