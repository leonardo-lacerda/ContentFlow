import {
  AiGenerateImagesHeader,
  CarouselLightbox,
  EmptyStudioState,
  ErrorBanner,
  SavedProjectsPanel,
  SessionCostSummary,
} from './ai-generate-images.sections';
import { AiGenerateImagesPlanningForm } from './ai-generate-images-planning-form';
import { ReferenceLibraryPanel } from './ai-generate-images-reference-library';
import { CreativeBriefPanel } from './ai-generate-images-creative-brief';
import { CarouselPreviewPanel } from './ai-generate-images-preview';
import { SlideEditorPanel } from './ai-generate-images-slide-editor';
import { ImageGenerationPanel } from './ai-generate-images-generation-panel';
import { PlanGeneratingState } from './ai-generate-images.loaders';

type AiGenerateImagesStudioViewProps = {
  studio: any;
};

export function AiGenerateImagesStudioView({ studio }: AiGenerateImagesStudioViewProps) {
  const {
    activePreview,
    allowOverBudget,
    applyCompanyBrandKit,
    applyEditorialQuickFixes,
    applyTemplate,
    approveReferenceForCompany,
    approvedReferencesCount,
    audience,
    brandColors,
    brandFonts,
    brandLogoReferences,
    brandName,
    brandNotes,
    brandReferencesCount,
    canSaveCarousel,
    cancelCarouselGeneration,
    companyIdeas,
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
    savedProjects,
    savingCarousel,
    savingReferenceLibrary,
    selectedCompanyId,
    selectedLogoReference,
    selectedLogoReferenceId,
    selectedReferences,
    selectedTemplate,
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
    setSlideCount,
    setTextModel,
    setTone,
    setTopic,
    setVisualStyle,
    showAdvanced,
    slideCount,
    slideHistory,
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
    uploadReferenceImages,
    uploadReferencesCount,
    visibleReferenceImages,
    structurePreset,
    setStructurePreset,
    colorPreset,
    setColorPreset,
    stylePreset,
    setStylePreset,
    typographyPreset,
    setTypographyPreset,
    inspirationsLeadVisual,
    setInspirationsLeadVisual,
    visualStyle,
  } = studio;

  return (
    <div className="relative min-h-[calc(100vh-100px)] w-full">
      {/* Animated Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_0%,rgba(120,113,108,0.12),transparent_28%),linear-gradient(180deg,rgba(245,245,244,0.08),transparent_40%)] dark:bg-[radial-gradient(circle_at_8%_0%,rgba(120,113,108,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_40%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] flex flex-col gap-[24px] pt-[20px] pb-[60px]">
        <AiGenerateImagesHeader />

        <SavedProjectsPanel
          importProjectInputRef={importProjectInputRef}
          loadingSavedProjects={loadingSavedProjects}
          savedProjects={savedProjects}
          onImportProjectJson={importProjectJson}
          onLoadProjectIntoStudio={loadProjectIntoStudio}
          onLoadSavedProjects={loadSavedProjects}
        />

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
          setSlideCount={setSlideCount}
          setTextModel={setTextModel}
          setTone={setTone}
          setTopic={setTopic}
          setVisualStyle={setVisualStyle}
          showAdvanced={showAdvanced}
          slideCount={slideCount}
          syncBrandReferences={syncBrandReferences}
          textModel={textModel}
          tone={tone}
          topic={topic}
          visualStyle={visualStyle}
        />

        <ErrorBanner message={error} />

        {planning && !plan && <PlanGeneratingState />}

        <EmptyStudioState visible={!plan && !planning && !error} />

        {plan && (
          <div className="flex flex-col gap-[24px]">
            <ReferenceLibraryPanel
              approveReferenceForCompany={approveReferenceForCompany}
              approvedReferencesCount={approvedReferencesCount}
              brandReferencesCount={brandReferencesCount}
              companyProfile={companyProfile}
              companyReferencesCount={companyReferencesCount}
              favoriteReferences={favoriteReferences}
              globalReferencesCount={globalReferencesCount}
              globalReferencesLoaded={globalReferencesLoaded}
              hiddenReferenceCount={hiddenReferenceCount}
              persistReferenceInCompanyLibrary={persistReferenceInCompanyLibrary}
              referenceCategoryFilter={referenceCategoryFilter}
              referenceCategories={referenceCategories}
              referenceImages={referenceImages}
              removeReferenceImage={removeReferenceImage}
              savingReferenceLibrary={savingReferenceLibrary}
              selectedReferences={selectedReferences}
              setReferenceCategoryFilter={setReferenceCategoryFilter}
              setReferenceDisplayLimit={setReferenceDisplayLimit}
              setReferenceImages={setReferenceImages}
              toggleReferenceFavorite={toggleReferenceFavorite}
              toggleReferenceSelection={toggleReferenceSelection}
              uploadReferenceImages={uploadReferenceImages}
              uploadReferencesCount={uploadReferencesCount}
              visibleReferenceImages={visibleReferenceImages}
            />

            <CreativeBriefPanel
              applyEditorialQuickFixes={applyEditorialQuickFixes}
              brandColors={brandColors}
              companyProfile={companyProfile}
              computedCreativeBrief={computedCreativeBrief}
              correctingEditorial={correctingEditorial}
              editorialReview={editorialReview}
              finalCreativeBrief={finalCreativeBrief}
              fixCarouselWithAi={fixCarouselWithAi}
              refreshCreativeBrief={refreshCreativeBrief}
              reviewCarouselQuality={reviewCarouselQuality}
              reviewingEditorial={reviewingEditorial}
              selectedReferences={selectedReferences}
              setFinalCreativeBrief={setFinalCreativeBrief}
              structurePreset={structurePreset}
              setStructurePreset={setStructurePreset}
              colorPreset={colorPreset}
              setColorPreset={setColorPreset}
              stylePreset={stylePreset}
              setStylePreset={setStylePreset}
              typographyPreset={typographyPreset}
              setTypographyPreset={setTypographyPreset}
              inspirationsLeadVisual={inspirationsLeadVisual}
              setInspirationsLeadVisual={setInspirationsLeadVisual}
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
              plan={plan}
              regenerateSlideCopy={regenerateSlideCopy}
              restoreImageVersion={restoreImageVersion}
              restoreSlideVersion={restoreSlideVersion}
              selectedReferences={selectedReferences}
              setLightboxIndex={setLightboxIndex}
              setPlan={setPlan}
              slideHistory={slideHistory}
              slideImageHistory={slideImageHistory}
              slideImages={slideImages}
              slideLoading={slideLoading}
              trimmedImageModel={trimmedImageModel}
              updateSlide={updateSlide}
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
      </div>
    </div>
  );
}
