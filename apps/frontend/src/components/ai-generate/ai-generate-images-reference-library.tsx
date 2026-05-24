import { REFERENCE_PAGE_SIZE } from './ai-generate-images.constants';
import type { CompanyProfile, ReferenceImage } from './ai-generate-images.types';

type ReferenceLibraryPanelProps = {
  approveReferenceForCompany: (image: ReferenceImage) => void;
  approvedReferencesCount: number;
  brandReferencesCount: number;
  companyProfile: CompanyProfile | null;
  companyReferencesCount: number;
  favoriteReferences: ReferenceImage[];
  globalReferencesCount: number;
  globalReferencesLoaded: boolean;
  hiddenReferenceCount: number;
  persistReferenceInCompanyLibrary: (
    image: ReferenceImage,
    updates: Partial<ReferenceImage>
  ) => void;
  referenceCategoryFilter: string;
  referenceCategories: string[];
  referenceImages: ReferenceImage[];
  removeReferenceImage: (id: string) => void;
  savingReferenceLibrary: string;
  selectedReferences: ReferenceImage[];
  setReferenceCategoryFilter: (category: string) => void;
  setReferenceDisplayLimit: (updater: (current: number) => number) => void;
  setReferenceImages: (updater: (current: ReferenceImage[]) => ReferenceImage[]) => void;
  toggleReferenceFavorite: (id: string) => void;
  toggleReferenceSelection: (id: string) => void;
  uploadReferenceImages: (event: any) => void;
  uploadReferencesCount: number;
  visibleReferenceImages: ReferenceImage[];
};

export function ReferenceLibraryPanel(props: ReferenceLibraryPanelProps) {
  const {
    approveReferenceForCompany,
    approvedReferencesCount,
    brandReferencesCount,
    companyProfile,
    companyReferencesCount,
    favoriteReferences,
    globalReferencesCount,
    globalReferencesLoaded,
    hiddenReferenceCount,
    persistReferenceInCompanyLibrary,
    referenceCategoryFilter,
    referenceCategories,
    referenceImages,
    removeReferenceImage,
    savingReferenceLibrary,
    selectedReferences,
    setReferenceCategoryFilter,
    setReferenceDisplayLimit,
    setReferenceImages,
    toggleReferenceFavorite,
    toggleReferenceSelection,
    uploadReferenceImages,
    uploadReferencesCount,
    visibleReferenceImages,
  } = props;

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[32px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[16px] flex flex-col gap-[14px] md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-[12px]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-[15px] font-[900] text-stone-800 dark:text-stone-100">
            2
          </div>
          <div>
            <h3 className="text-[22px] font-[800] text-white">
              Escolha inspirações para as imagens
            </h3>
            <p className="mt-[4px] max-w-[720px] text-[14px] text-black/60 dark:text-white/60">
              Depois da copy, selecione até 3 posts de exemplo. O sistema usa
              essas referências para adaptar composição, paleta, textura
              e hierarquia visual, sem copiar marca ou elementos
              protegidos.
            </p>
            <p className="mt-[8px] text-[13px] font-[800] text-stone-700 dark:text-stone-200">
              Clique nas imagens abaixo para selecionar. Favoritar ajuda
              a separar as melhores referências.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-[10px]">
          <span
            className={`rounded-full px-[12px] py-[8px] text-[13px] font-[900] ${
              selectedReferences.length
                ? 'bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950'
                : 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/70'
            }`}
          >
            {selectedReferences.length}/3 selecionadas
          </span>
          <label className="cursor-pointer rounded-[10px] border border-black/10 bg-white px-[14px] py-[10px] text-[13px] font-[900] text-black hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
            Enviar inspiração
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={uploadReferenceImages}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="mb-[14px] flex flex-wrap items-center gap-[8px] text-[12px] text-black/60 dark:text-white/60">
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[6px]">
          Biblioteca _saved: {globalReferencesCount}
        </span>
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[6px]">
          Upload do usuário: {uploadReferencesCount}
        </span>
	                <span className="rounded-[999px] border border-stone-500/20 bg-stone-500/10 px-[10px] py-[6px] font-[800] text-stone-700 dark:text-stone-200">
	                  Brand Kit: {brandReferencesCount}
	                </span>
	                <span className="rounded-[999px] border border-stone-500/20 bg-stone-500/10 px-[10px] py-[6px] font-[800] text-stone-700 dark:text-stone-200">
	                  Biblioteca da empresa: {companyReferencesCount}
	                </span>
	                <span className="rounded-[999px] border border-stone-500/20 bg-stone-500/10 px-[10px] py-[6px] font-[800] text-stone-700 dark:text-stone-200">
	                  Aprovadas: {approvedReferencesCount}
	                </span>
	                <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[6px]">
	                  Favoritas: {favoriteReferences.length}
	                </span>
        {!selectedReferences.length && (
          <span className="rounded-[999px] border border-amber-500/25 bg-amber-500/10 px-[10px] py-[6px] font-[800] text-amber-700 dark:text-amber-200">
            Opcional, mas melhora muito o resultado visual
          </span>
        )}
	              </div>

	              {!!referenceCategories.length && (
	                <div className="mb-[14px] flex flex-wrap gap-[8px]">
	                  {['todas', ...referenceCategories].map((category) => (
	                    <button
	                      key={category}
	                      type="button"
	                      onClick={() => setReferenceCategoryFilter(category)}
	                      className={`rounded-[999px] border px-[11px] py-[7px] text-[12px] font-[800] transition ${
	                        referenceCategoryFilter === category
	                          ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
	                          : 'border-black/10 bg-black/[0.03] text-black/60 hover:border-stone-500/40 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
	                      }`}
	                    >
	                      {category === 'todas' ? 'Todas' : category}
	                    </button>
	                  ))}
	                </div>
	              )}

      {!!selectedReferences.length && (
        <div className="mb-[14px] rounded-[14px] border border-stone-500/20 bg-stone-500/10 p-[12px]">
          <div className="mb-[8px] text-[12px] font-[900] uppercase tracking-[0.14em] text-stone-700 dark:text-stone-200">
            Inspirações selecionadas
          </div>
          <p className="mb-[10px] text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">
            Essas imagens serão analisadas primeiro para virar um brief
            visual de estilo. Depois a imagem final será gerada com
            gpt-image-2 usando esse brief como direção criativa.
          </p>
          <div className="flex gap-[8px] overflow-x-auto">
            {selectedReferences.map((image) => (
              <button
                key={`selected-${image.id}`}
                type="button"
                onClick={() => toggleReferenceSelection(image.id)}
                className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-[10px] border border-stone-400"
                title="Remover seleção"
              >
                <img
                  src={image.src}
                  alt={image.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/70 py-[3px] text-[10px] font-[800] text-white">
                  Remover
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!globalReferencesLoaded && referenceImages.length === 0 ? (
        <div className="rounded-[14px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 p-[22px] text-[14px] text-black/60 dark:text-white/60">
          Carregando biblioteca global de referências...
        </div>
      ) : referenceImages.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-white/15 bg-white/5 p-[22px] text-[14px] text-black/60 dark:text-white/60">
          Nenhuma referência disponível. Use upload para adicionar
          inspirações.
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto rounded-[16px] border border-black/10 bg-stone-50 p-[10px] dark:border-white/10 dark:bg-black/20">
          <div className="grid grid-cols-2 gap-[12px] md:grid-cols-4 lg:grid-cols-6">
            {visibleReferenceImages.map((image) => (
              <div
                key={image.id}
                className={`overflow-hidden rounded-[12px] border bg-white transition dark:bg-white/5 ${
                  image.selected
                    ? 'border-stone-950 shadow-[0_0_0_2px_rgba(28,25,23,0.16)] dark:border-white'
                    : 'border-black/10 hover:border-stone-500/40 dark:border-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleReferenceSelection(image.id)}
                  className="relative block aspect-square w-full overflow-hidden"
                >
                  <img
                    src={image.src}
                    alt={image.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  {image.selected && (
                    <span className="absolute right-[8px] top-[8px] rounded-full bg-stone-950 px-[8px] py-[4px] dark:bg-white dark:text-stone-950 text-[11px] font-[900] text-white shadow-lg">
                      Usando
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-between gap-[6px] p-[8px]">
                  <button
                    type="button"
                    onClick={() => toggleReferenceFavorite(image.id)}
                    className={`rounded-[8px] px-[8px] py-[6px] text-[12px] font-[700] ${
                      image.favorite
                        ? 'bg-yellow-500/20 text-yellow-200'
                        : 'bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15'
                    }`}
                  >
                    {image.favorite ? 'Favorita' : 'Favoritar'}
                  </button>
	                          {image.source === 'upload' ? (
	                            <button
                      type="button"
                      onClick={() => removeReferenceImage(image.id)}
                      className="rounded-[8px] bg-black/5 px-[8px] py-[6px] text-[12px] font-[700] text-black/60 hover:text-red-600 dark:bg-white/10 dark:text-white/70 dark:hover:text-red-300"
                    >
	                              Remover
	                            </button>
	                          ) : image.source === 'brand' ? (
	                            <span className="rounded-[8px] bg-stone-500/10 px-[8px] py-[6px] text-[11px] font-[800] text-stone-700 dark:text-stone-200">
	                              Marca
	                            </span>
	                          ) : image.source === 'company' ? (
	                            <span className="rounded-[8px] bg-stone-500/10 px-[8px] py-[6px] text-[11px] font-[800] text-stone-700 dark:text-stone-200">
	                              Empresa
	                            </span>
	                          ) : (
	                            <span className="rounded-[8px] bg-black/5 px-[8px] py-[6px] text-[11px] font-[700] text-black/55 dark:bg-white/10 dark:text-white/60">
	                              Biblioteca
	                            </span>
	                          )}
	                        </div>
	                        {image.source !== 'brand' && (
	                          <div className="grid grid-cols-1 gap-[6px] px-[8px] pb-[8px]">
	                            <button
	                              type="button"
	                              onClick={() => approveReferenceForCompany(image)}
	                              disabled={!companyProfile?.id || savingReferenceLibrary === image.id}
	                              className={`rounded-[8px] px-[8px] py-[7px] text-[11px] font-[900] disabled:cursor-not-allowed disabled:opacity-50 ${
	                                image.approved
	                                  ? 'bg-emerald-500/20 text-emerald-200'
	                                  : 'bg-white/10 text-white/70 hover:bg-emerald-500/15 hover:text-emerald-100'
	                              }`}
	                            >
	                              {savingReferenceLibrary === image.id
	                                ? 'Salvando...'
	                                : image.approved
	                                ? 'Aprovada'
	                                : 'Aprovar p/ empresa'}
	                            </button>
	                            <select
	                              value={image.category || 'geral'}
	                              onChange={(event) => {
	                                const category = event.target.value;
	                                setReferenceImages((current) =>
	                                  current.map((item) =>
	                                    item.id === image.id
	                                      ? { ...item, category }
	                                      : item
	                                  )
	                                );
	                                persistReferenceInCompanyLibrary(image, {
	                                  category,
	                                  favorite: image.favorite,
	                                  approved: image.approved,
	                                });
	                              }}
	                              disabled={!companyProfile?.id || savingReferenceLibrary === image.id}
	                              className="h-[32px] rounded-[8px] border border-black/10 bg-white px-[8px] text-[11px] font-[700] text-black dark:border-white/10 dark:bg-black/40 dark:text-white outline-none"
	                            >
	                              {['geral', 'educacional', 'storytelling', 'lista', 'oferta', 'case', 'mitos', 'brand-kit', 'upload'].map((category) => (
	                                <option key={category} value={category}>
	                                  {category}
	                                </option>
	                              ))}
	                            </select>
	                          </div>
	                        )}
	                      </div>
	                    ))}
          </div>
          {hiddenReferenceCount > 0 && (
            <div className="mt-[12px] flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setReferenceDisplayLimit(
                    (current) => current + REFERENCE_PAGE_SIZE
                  )
                }
                className="rounded-[10px] border border-black/10 bg-white px-[14px] py-[8px] text-[12px] font-[800] text-black/70 hover:border-stone-500/40 dark:border-white/10 dark:bg-white/10 dark:text-black/70 dark:text-white/80"
              >
                Mostrar mais{' '}
                {Math.min(hiddenReferenceCount, REFERENCE_PAGE_SIZE)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
