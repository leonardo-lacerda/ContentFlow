const fs = require('fs');
const f = 'C:/Users/Leo/Documents/ContentFlow/apps/frontend/src/components/brand-dna/brand-detail-page.component.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. Update BrandHealthBar to include messaging/contentGuidelines fields
const oldHealthFields = `  const fields = [
    dna.summary?.tagline, dna.summary?.description, dna.summary?.industry, dna.summary?.targetAudience,
    dna.voice?.tone, dna.voice?.style, dna.voice?.personality,
    dna.audience?.demographics, dna.audience?.painPoints?.length > 0, dna.audience?.desires?.length > 0,
    dna.offer?.products?.length > 0 || dna.offer?.services?.length > 0, dna.offer?.uniqueSellingPoints?.length > 0,
    dna.visual?.colors?.length > 0, dna.visual?.style,
    dna.constraints?.do?.length > 0 || dna.constraints?.avoid?.length > 0,
  ];`;

const newHealthFields = `  const fields = [
    dna.summary?.tagline, dna.summary?.description, dna.summary?.industry, dna.summary?.targetAudience,
    dna.voice?.tone, dna.voice?.style, dna.voice?.personality,
    dna.audience?.demographics, dna.audience?.painPoints?.length > 0, dna.audience?.desires?.length > 0,
    dna.offer?.products?.length > 0 || dna.offer?.services?.length > 0, dna.offer?.uniqueSellingPoints?.length > 0,
    dna.visual?.colors?.length > 0, dna.visual?.style,
    dna.constraints?.do?.length > 0 || dna.constraints?.avoid?.length > 0,
    dna.messaging?.brandValues?.length > 0 || dna.messaging?.brandStory,
    dna.messaging?.messagingPillars?.length > 0, dna.messaging?.competitors?.length > 0,
    dna.messaging?.keyCTAs?.length > 0, dna.messaging?.emotionalTriggers?.length > 0,
    dna.contentGuidelines?.postLengthHint || dna.contentGuidelines?.emojiUsage,
    dna.contentGuidelines?.contentMix?.length > 0 || dna.contentGuidelines?.bestPractices?.length > 0,
  ];`;

c = c.replace(oldHealthFields, newHealthFields);

// 2. Add new form fields to the manual DNA creation modal
// Find the existing form declaration
const oldFormFields = `      constraintsDo: '',
      constraintsAvoid: '',
      constraintsRequiredElements: '',
    };`;

const newFormFields = `      constraintsDo: '',
      constraintsAvoid: '',
      constraintsRequiredElements: '',
      messagingBrandValues: '',
      messagingBrandStory: '',
      messagingCompetitors: '',
      messagingPillars: '',
      messagingKeyCTAs: '',
      messagingEmotionalTriggers: '',
      contentGuidelinesPostLengthHint: '',
      contentGuidelinesEmojiUsage: '',
      contentGuidelinesHashtagStrategy: '',
      contentGuidelinesContentMix: '',
      contentGuidelinesBestPractices: '',
    };`;

c = c.replace(oldFormFields, newFormFields);

// 3. Add new Section UI elements after the "Diretrizes" section in the modal
const oldDiretrizesSection = `          <Section title="Diretrizes">
            <Field label="Fazer (v\u00EDrgula separada)" value={form.constraintsDo} onChange={(v) => { form.constraintsDo = v; }} />
            <Field label="Evitar (v\u00EDrgula separada)" value={form.constraintsAvoid} onChange={(v) => { form.constraintsAvoid = v; }} />
            <Field label="Elementos obrigat\u00F3rios (v\u00EDrgula separada)" value={form.constraintsRequiredElements} onChange={(v) => { form.constraintsRequiredElements = v; }} />
          </Section>`;

const newDiretrizesSection = `          <Section title="Diretrizes">
            <Field label="Fazer (v\u00EDrgula separada)" value={form.constraintsDo} onChange={(v) => { form.constraintsDo = v; }} />
            <Field label="Evitar (v\u00EDrgula separada)" value={form.constraintsAvoid} onChange={(v) => { form.constraintsAvoid = v; }} />
            <Field label="Elementos obrigat\u00F3rios (v\u00EDrgula separada)" value={form.constraintsRequiredElements} onChange={(v) => { form.constraintsRequiredElements = v; }} />
          </Section>
          <Section title="Comunicacao da Marca">
            <Field label="Valores da marca (v\u00EDrgula separada)" value={form.messagingBrandValues} onChange={(v) => { form.messagingBrandValues = v; }} />
            <Field label="Historia da marca" value={form.messagingBrandStory} onChange={(v) => { form.messagingBrandStory = v; }} textarea />
            <Field label="Concorrentes (v\u00EDrgula separada)" value={form.messagingCompetitors} onChange={(v) => { form.messagingCompetitors = v; }} />
            <Field label="Pilares de comunicacao (v\u00EDrgula separada)" value={form.messagingPillars} onChange={(v) => { form.messagingPillars = v; }} />
            <Field label="Chamadas para acao (v\u00EDrgula separada)" value={form.messagingKeyCTAs} onChange={(v) => { form.messagingKeyCTAs = v; }} />
            <Field label="Gatilhos emocionais (v\u00EDrgula separada)" value={form.messagingEmotionalTriggers} onChange={(v) => { form.messagingEmotionalTriggers = v; }} />
          </Section>
          <Section title="Diretrizes de Conteudo">
            <Field label="Tamanho dos posts" value={form.contentGuidelinesPostLengthHint} onChange={(v) => { form.contentGuidelinesPostLengthHint = v; }} />
            <Field label="Uso de emojis" value={form.contentGuidelinesEmojiUsage} onChange={(v) => { form.contentGuidelinesEmojiUsage = v; }} />
            <Field label="Estrategia de hashtags (v\u00EDrgula separada)" value={form.contentGuidelinesHashtagStrategy} onChange={(v) => { form.contentGuidelinesHashtagStrategy = v; }} />
            <Field label="Mix de conteudo (v\u00EDrgula separada)" value={form.contentGuidelinesContentMix} onChange={(v) => { form.contentGuidelinesContentMix = v; }} />
            <Field label="Melhores praticas (v\u00EDrgula separada)" value={form.contentGuidelinesBestPractices} onChange={(v) => { form.contentGuidelinesBestPractices = v; }} />
          </Section>`;

c = c.replace(oldDiretrizesSection, newDiretrizesSection);

// 4. Add messaging + contentGuidelines to the save payload
const oldSavePayload = `                  constraints: {
                    do: form.constraintsDo.split(',').map(s => s.trim()).filter(Boolean),
                    avoid: form.constraintsAvoid.split(',').map(s => s.trim()).filter(Boolean),
                    requiredElements: form.constraintsRequiredElements.split(',').map(s => s.trim()).filter(Boolean),
                  },`;

const newSavePayload = `                  constraints: {
                    do: form.constraintsDo.split(',').map(s => s.trim()).filter(Boolean),
                    avoid: form.constraintsAvoid.split(',').map(s => s.trim()).filter(Boolean),
                    requiredElements: form.constraintsRequiredElements.split(',').map(s => s.trim()).filter(Boolean),
                  },
                  messaging: {
                    brandValues: form.messagingBrandValues.split(',').map(s => s.trim()).filter(Boolean),
                    brandStory: form.messagingBrandStory,
                    competitors: form.messagingCompetitors.split(',').map(s => s.trim()).filter(Boolean),
                    messagingPillars: form.messagingPillars.split(',').map(s => s.trim()).filter(Boolean),
                    keyCTAs: form.messagingKeyCTAs.split(',').map(s => s.trim()).filter(Boolean),
                    emotionalTriggers: form.messagingEmotionalTriggers.split(',').map(s => s.trim()).filter(Boolean),
                  },
                  contentGuidelines: {
                    postLengthHint: form.contentGuidelinesPostLengthHint,
                    emojiUsage: form.contentGuidelinesEmojiUsage,
                    hashtagStrategy: form.contentGuidelinesHashtagStrategy.split(',').map(s => s.trim()).filter(Boolean),
                    contentMix: form.contentGuidelinesContentMix.split(',').map(s => s.trim()).filter(Boolean),
                    bestPractices: form.contentGuidelinesBestPractices.split(',').map(s => s.trim()).filter(Boolean),
                  },`;

c = c.replace(oldSavePayload, newSavePayload);

fs.writeFileSync(f, c, 'utf8');
console.log('BrandHealthBar + modal form updated successfully');
console.log('Has messagingBrandValues:', c.includes('messagingBrandValues'));
console.log('Has contentGuidelinesPostLengthHint:', c.includes('contentGuidelinesPostLengthHint'));
console.log('Has messaging in payload:', c.includes('messaging: {'));
