import { useState } from 'react';
import {
  AiGenerateImagesHeader,
  CarouselLightbox,
  EmptyStudioState,
  ErrorBanner,
  SessionCostSummary,
} from './ai-generate-images.sections';
import { AiGenerateImagesPlanningForm } from './ai-generate-images-planning-form';
import { DirectionPanel } from './ai-generate-images-direction-panel';
import { CaptionPanel } from './ai-generate-images-caption-panel';
import { CompanyGalleryPanel } from './ai-generate-images-gallery-panel';
import { CarouselPreviewPanel } from './ai-generate-images-preview';
import { SlideEditorPanel } from './ai-generate-images-slide-editor';
import { ImageGenerationPanel } from './ai-generate-images-generation-panel';
import { EditorialReviewPanel } from './editorial-review-panel';
import { EditorialBlockModal } from './editorial-block-modal';
import { ReferenceLibraryPanel } from './reference-library-panel';
import { PlanGeneratingState } from './ai-generate-images.loaders';

type AiGenerateImagesStudioViewProps = {
  studio: any;
};

export function AiGenerateImagesStudioView({ studio }: AiGenerateImagesStudioViewProps) {
  const [showSavedProjects, setShowSavedProjects] = useState(false);
  const [showReferenceLibrary, setShowReferenceLibrary] = useState(false);
  const {
    activePreview,
    allowGenerateWithReviewIssues,
    setAllowGenerateWithReviewIssues,
    allowOverBudget,
    applyCompanyBrandKit,
    applyEditorialQuickFixes,
    applyTemplate,
    approveReferenceForCompany,
    approvedReferencesCount,
    audience,
    autoReviewBeforeImages,
    setAutoReviewBeforeImages,
    brandColors,
    brandFonts,
    brandLogoReferences,
    brandName,
    brandNotes,
    brandReferencesCount,
    canSaveCarousel,
    cancelCarouselGeneration,
    companyIdeas,
    companyGallery,
    companyProfile,
    companyProfiles,
    companyReferencesCount,
    computedCreativeBrief,
    correctingEditorial,
    costHistory,
    costLimitBrl,
    defaultCta,
    editorialIssues,
    editorialReview,
    error,
    estimateGenerationCost,
    exportCarouselPackage,
    exportHeight,
    exportingPackage,
    exportWidth,
    favoriteReferences,
    finalCreativeBrief,
    fixCarouselWithAi,
    forbiddenTerms,
    generateCarouselImages,
    generateCompanyIdeas,
    generatePlan,
    generateSlideImage,
    generatedSlides,
    generatingImages,
    globalReferencesCount,
    globalReferencesLoaded,
    goal,
    hasRequiredCompanySummary,
    hiddenReferenceCount,
    imageCost,
    imageDisabled,
    imageDisabledReason,
    imageJob,
    imageJobProgress,
    imageModel,
    imageProvider,
    importProjectInputRef,
    importProjectJson,
    includePdfExport,
    isOverSoftLimit,
    isOverUserLimit,
    ideasError,
    lightboxIndex,
    loadProjectIntoStudio,
    loadSavedProjects,
    loadingCompanyProfile,
    loadingIdeas,
    loadingSavedProjects,
    logoPosition,
    logoScale,
    logoUsage,
    persistReferenceInCompanyLibrary,
    plan,
    planDisabled,
    planning,
    platform,
    preflightEstimate,
    projectedCostBrl,
    referenceCategoryFilter,
    referenceCategories,
    referenceImages,
    refreshCreativeBrief,
    regenerateSlideCopy,
    removeReferenceImage,
    restoreImageVersion,
    restoreSlideVersion,
    reviewCarouselQuality,
    reviewingEditorial,
    saveCarouselToMedia,
    savedCarouselCount,
    savedCarouselProject,
    savedCarouselProjectId,
    savedProjects,
    savingCarousel,
    savingReferenceLibrary,
    saveBrandDefaults,
    savingBrandDefaults,
    generateCaption,
    generatingCaption,
    captionPlatform,
    postCaption,
    setPostCaption,
    postHashtags,
    captionError,
    selectedCompanyId,
    selectedLogoReference,
    selectedLogoReferenceId,
    selectedReferences,
    selectedTemplate,
    selectedNiche,
    setActivePreview,
    setAllowOverBudget,
    setAudience,
    setBrandColors,
    setBrandFonts,
    setBrandName,
    setBrandNotes,
    setCompanyIdeas,
    setCostLimitBrl,
    setDefaultCta,
    setExportHeight,
    setExportWidth,
    setFinalCreativeBrief,
    setForbiddenTerms,
    setGoal,
    setIdeasError,
    setImageModel,
    setImageProvider,
    setIncludePdfExport,
    setLightboxIndex,
    setLogoPosition,
    setLogoScale,
    setLogoUsage,
    setPlan,
    setPlatform,
    setReferenceCategoryFilter,
    setReferenceDisplayLimit,
    setReferenceImages,
    setSelectedCompanyId,
    setSelectedLogoReferenceId,
    setShowAdvanced,
    sourceUrl,
    setSourceUrl,
    sourceText,
    setSourceText,
    setSlideCount,
    setTextModel,
    setTone,
    setTopic,
    setVisualStyle,
    showAdvanced,
    slideCount,
    slideHistory,
    slideImageAdjustments,
    setSlideImageAdjustment,
    slideImageHistory,
    slideImages,
    slideLoading,
    syncBrandReferences,
    template,
    textCost,
    textModel,
    toggleReferenceFavorite,
    toggleReferenceSelection,
    tone,
    topic,
    totalCost,
    trimmedImageModel,
    trimmedTextModel,
    trimmedTopic,
    updateSlide,
    addSlide,
    removeSlide,
    duplicateSlide,
    moveSlide,
    undo,
    redo,
    canUndo,
    canRedo,
    uploadReferenceImages,
    uploadReferencesCount,
    visibleReferenceImages,
    structurePreset,
    setStructurePreset,
    colorPreset,
    setColorPreset,
    stylePreset,
    setStylePreset,
    setSelectedNiche,
    typographyPreset,
    setTypographyPreset,
    inspirationsLeadVisual,
    setInspirationsLeadVisual,
    directionSpec,
    setDirectionSpec,
    directionSuggestedAxes,
    directionDerivedFrom,
    visualStyle,
    backendTemplates,
    templateRecommendations,
    loadingRecommendations,
    templatesLoaded,
    requestRecommendations,
    scoreThreshold,
    setScoreThreshold,
    showBlockModal,
    setShowBlockModal,
  } = studio;

  return (
    <div className="relative min-h-[calc(100vh-100px)] w-full">
      {/* Animated Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_0%,rgba(120,113,108,0.12),transparent_28%),linear-gradient(180deg,rgba(245,245,244,0.08),transparent_40%)] dark:bg-[radial-gradient(circle_at_8%_0%,rgba(120,113,108,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_40%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] flex flex-col gap-[24px] pt-[20px] pb-[60px]">
        <AiGenerateImagesHeader
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />

        <div className="flex flex-col gap-[12px]">
          <button
            type="button"
            onClick={() => setShowSavedProjects((value) => !value)}
            className="flex w-fit items-center gap-[8px] rounded-[10px] border border-black/10 bg-white px-[14px] py-[9px] text-[13px] font-[800] text-black/70 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
          >
            {showSavedProjects ? 'Ocultar galeria' : 'Galeria da empresa'}
            {companyGallery.length > 0 && (
              <span className="rounded-full bg-stone-900/10 px-[8px] py-[2px] text-[11px] font-[900] text-black/70 dark:bg-white/10 dark:text-white/80">
                {companyGallery.length}
              </span>
            )}
          </button>

          {showSavedProjects && (
            <CompanyGalleryPanel
              items={companyGallery}
              loading={loadingSavedProjects}
              importProjectInputRef={importProjectInputRef}
              onImportProjectJson={importProjectJson}
              onOpen={loadProjectIntoStudio}
              onRefresh={loadSavedProjects}
            />
          )}
        </div>

        <div className="flex flex-col gap-[12px]">
          <button
            type="button"
            onClick={() => setShowReferenceLibrary((value) => !value)}
            className="flex w-fit items-center gap-[8px] rounded-[10px] border border-black/10 bg-white px-[14px] py-[9px] text-[13px] font-[800] text-black/70 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
          >
            {showReferenceLibrary ? 'Ocultar biblioteca' : 'Biblioteca de referências'}
            {referenceImages.length > 0 && (
              <span className="rounded-full bg-stone-900/10 px-[8px] py-[2px] text-[11px] font-[900] text-black/70 dark:bg-white/10 dark:text-white/80">
                {referenceImages.length}
              </span>
            )}
            {selectedReferences.length > 0 && (
              <span className="rounded-full bg-stone-900 px-[8px] py-[2px] text-[11px] font-[900] text-white dark:bg-white dark:text-stone-900">
                {selectedReferences.length} selecionadas
              </span>
            )}
          </button>

          {showReferenceLibrary && (
            <ReferenceLibraryPanel
              referenceImages={referenceImages}
              visibleReferenceImages={visibleReferenceImages}
              referenceDisplayLimit={referenceDisplayLimit}
              referenceCategoryFilter={referenceCategoryFilter}
              setReferenceCategoryFilter={setReferenceCategoryFilter}
              toggleReferenceSelection={toggleReferenceSelection}
              toggleReferenceFavorite={toggleReferenceFavorite}
              referenceCategories={referenceCategories}
              uploadReferenceImages={uploadReferenceImages}
              hiddenReferenceCount={hiddenReferenceCount}
              globalReferencesCount={globalReferencesCount}
              uploadReferencesCount={uploadReferencesCount}
              brandReferencesCount={brandReferencesCount}
              companyReferencesCount={companyReferencesCount}
              setReferenceDisplayLimit={setReferenceDisplayLimit}
            />
          )}
        </div>

        <AiGenerateImagesPlanningForm
          applyCompanyBrandKit={applyCompanyBrandKit}
          applyTemplate={applyTemplate}
          audience={audience}
          brandColors={brandColors}
          brandFonts={brandFonts}
          brandLogoReferences={brandLogoReferences}
          brandName={brandName}
          brandNotes={brandNotes}
          companyIdeas={companyIdeas}
          companyProfile={companyProfile}
          companyProfiles={companyProfiles}
          defaultCta={defaultCta}
          forbiddenTerms={forbiddenTerms}
          generateCompanyIdeas={generateCompanyIdeas}
          generatePlan={generatePlan}
          goal={goal}
          hasRequiredCompanySummary={hasRequiredCompanySummary}
          ideasError={ideasError}
          loadingCompanyProfile={loadingCompanyProfile}
          loadingIdeas={loadingIdeas}
          logoPosition={logoPosition}
          logoScale={logoScale}
          logoUsage={logoUsage}
          planDisabled={planDisabled}
          planning={planning}
          platform={platform}
          selectedCompanyId={selectedCompanyId}
          selectedLogoReferenceId={selectedLogoReferenceId}
          selectedTemplate={selectedTemplate}
          setAudience={setAudience}
          setBrandColors={setBrandColors}
          setBrandFonts={setBrandFonts}
          setBrandName={setBrandName}
          setBrandNotes={setBrandNotes}
          setCompanyIdeas={setCompanyIdeas}
          setDefaultCta={setDefaultCta}
          setForbiddenTerms={setForbiddenTerms}
          setGoal={setGoal}
          setIdeasError={setIdeasError}
          setLogoPosition={setLogoPosition}
          setLogoScale={setLogoScale}
          setLogoUsage={setLogoUsage}
          setPlatform={setPlatform}
          setSelectedCompanyId={setSelectedCompanyId}
          setSelectedLogoReferenceId={setSelectedLogoReferenceId}
          setShowAdvanced={setShowAdvanced}
          sourceUrl={sourceUrl}
          setSourceUrl={setSourceUrl}
          sourceText={sourceText}
          setSourceText={setSourceText}
          setSlideCount={setSlideCount}
          setTextModel={setTextModel}
          setTone={setTone}
          setTopic={setTopic}
          setVisualStyle={setVisualStyle}
          showAdvanced={showAdvanced}
          slideCount={slideCount}
          syncBrandReferences={syncBrandReferences}
          saveBrandDefaults={saveBrandDefaults}
          savingBrandDefaults={savingBrandDefaults}
          textModel={textModel}
          tone={tone}
          topic={topic}
          visualStyle={visualStyle}
          templateRecommendations={templateRecommendations}
          loadingRecommendations={loadingRecommendations}
          templatesLoaded={templatesLoaded}
          requestRecommendations={requestRecommendations}
          selectedNiche={selectedNiche}
          setSelectedNiche={setSelectedNiche}
        />

        <ErrorBanner message={error} />

        {planning && !plan && <PlanGeneratingState />}

        <EmptyStudioState visible={!plan && !planning && !error} />

        {plan && (
          <div className="flex flex-col gap-[24px]">
            <DirectionPanel
              spec={directionSpec}
              setSpec={setDirectionSpec}
              platform={platform}
              sampleHeadline={plan?.slides?.[0]?.headline || plan?.title}
              sampleHeadlines={
                plan?.slides?.length
                  ? [
                      plan.slides[0]?.headline,
                      plan.slides[Math.floor(plan.slides.length / 2)]?.headline,
                      plan.slides[plan.slides.length - 1]?.headline,
                    ].filter(Boolean)
                  : undefined
              }
              derivedFrom={directionDerivedFrom}
              suggestedAxes={directionSuggestedAxes}
              brandColors={brandColors}
              applyEditorialQuickFixes={applyEditorialQuickFixes}
              correctingEditorial={correctingEditorial}
              editorialReview={editorialReview}
              fixCarouselWithAi={fixCarouselWithAi}
              reviewCarouselQuality={reviewCarouselQuality}
              reviewingEditorial={reviewingEditorial}
            />

            <EditorialReviewPanel
              editorialIssues={editorialIssues}
              editorialReview={editorialReview}
              reviewingEditorial={reviewingEditorial}
              correctingEditorial={correctingEditorial}
              onRunReview={reviewCarouselQuality}
              onApplyQuickFixes={applyEditorialQuickFixes}
              onFixWithAi={fixCarouselWithAi}
              autoReviewBeforeImages={autoReviewBeforeImages}
              onToggleAutoReview={setAutoReviewBeforeImages}
              allowGenerateWithReviewIssues={allowGenerateWithReviewIssues}
              onToggleAllowGenerate={setAllowGenerateWithReviewIssues}
            />

            <CarouselPreviewPanel
              activePreview={activePreview}
              brandName={brandName}
              editorialIssues={editorialIssues}
              generatingImages={generatingImages}
              plan={plan}
              platform={platform}
              setActivePreview={setActivePreview}
              setLightboxIndex={setLightboxIndex}
              slideImages={slideImages}
              template={template}
            />

            <SlideEditorPanel
              generateSlideImage={generateSlideImage}
              exportSingleSlide={exportSingleSlide}
              plan={plan}
              regenerateSlideCopy={regenerateSlideCopy}
              restoreImageVersion={restoreImageVersion}
              restoreSlideVersion={restoreSlideVersion}
              selectedReferences={selectedReferences}
              setLightboxIndex={setLightboxIndex}
              setPlan={setPlan}
              slideHistory={slideHistory}
              slideImageAdjustments={slideImageAdjustments}
              setSlideImageAdjustment={setSlideImageAdjustment}
              slideImageHistory={slideImageHistory}
              slideImages={slideImages}
              slideLoading={slideLoading}
              trimmedImageModel={trimmedImageModel}
              updateSlide={updateSlide}
              addSlide={addSlide}
              removeSlide={removeSlide}
              duplicateSlide={duplicateSlide}
              moveSlide={moveSlide}
            />

            <CaptionPanel
              platform={platform}
              captionPlatform={captionPlatform}
              caption={postCaption}
              hashtags={postHashtags}
              loading={generatingCaption}
              error={captionError}
              onGenerate={generateCaption}
              onCaptionChange={setPostCaption}
            />

            <ImageGenerationPanel
              allowOverBudget={allowOverBudget}
              canSaveCarousel={canSaveCarousel}
              cancelCarouselGeneration={cancelCarouselGeneration}
              costHistory={costHistory}
              costLimitBrl={costLimitBrl}
              error={error}
              estimateGenerationCost={estimateGenerationCost}
              exportCarouselPackage={exportCarouselPackage}
              exportHeight={exportHeight}
              exportingPackage={exportingPackage}
              exportWidth={exportWidth}
              generateCarouselImages={generateCarouselImages}
              generatedSlides={generatedSlides}
              generatingImages={generatingImages}
              imageDisabled={imageDisabled}
              imageDisabledReason={imageDisabledReason}
              imageJob={imageJob}
              imageJobProgress={imageJobProgress}
              imageModel={imageModel}
              imageProvider={imageProvider}
              includePdfExport={includePdfExport}
              isOverSoftLimit={isOverSoftLimit}
              isOverUserLimit={isOverUserLimit}
              plan={plan}
              preflightEstimate={preflightEstimate}
              projectedCostBrl={projectedCostBrl}
              saveCarouselToMedia={saveCarouselToMedia}
              savedCarouselCount={savedCarouselCount}
              savedCarouselProject={savedCarouselProject}
              savedCarouselProjectId={savedCarouselProjectId}
              savingCarousel={savingCarousel}
              setAllowOverBudget={setAllowOverBudget}
              setCostLimitBrl={setCostLimitBrl}
              setExportHeight={setExportHeight}
              setExportWidth={setExportWidth}
              setImageModel={setImageModel}
              setImageProvider={setImageProvider}
              setIncludePdfExport={setIncludePdfExport}
              slideImages={slideImages}
              showAdvanced={showAdvanced}
            />
          </div>
        )}

        <SessionCostSummary
          brl={totalCost.brl}
          visible={(textCost?.brl ?? 0) > 0 || imageCost.brl > 0}
        />

        <CarouselLightbox
          lightboxIndex={lightboxIndex}
          plan={plan}
          slideImages={slideImages}
          setLightboxIndex={setLightboxIndex}
        />

        {/* Editorial score block modal */}
        {showBlockModal && editorialReview && (
          <EditorialBlockModal
            review={editorialReview}
            threshold={scoreThreshold}
            onFix={() => {
              setShowBlockModal(false);
              fixCarouselWithAi();
            }}
            onOverride={() => {
              setAllowGenerateWithReviewIssues(true);
              setShowBlockModal(false);
              generateCarouselImages();
            }}
            onDismiss={() => setShowBlockModal(false)}
            correcting={correctingEditorial}
          />
        )}
      </div>
    </div>
  );
}
