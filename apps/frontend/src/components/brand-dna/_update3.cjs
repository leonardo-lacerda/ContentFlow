const fs = require('fs');
const f = 'C:/Users/Leo/Documents/ContentFlow/apps/frontend/src/components/brand-dna/brand-detail-page.component.tsx';
let c = fs.readFileSync(f, 'utf8');

// Normalize line endings first
c = c.replace(/\r\n/g, '\n');

// 1. Add new form fields
c = c.replace(
  "      constraintsRequiredElements: '',\n    };",
  "      constraintsRequiredElements: '',\n      messagingBrandValues: '',\n      messagingBrandStory: '',\n      messagingCompetitors: '',\n      messagingPillars: '',\n      messagingKeyCTAs: '',\n      messagingEmotionalTriggers: '',\n      contentGuidelinesPostLengthHint: '',\n      contentGuidelinesEmojiUsage: '',\n      contentGuidelinesHashtagStrategy: '',\n      contentGuidelinesContentMix: '',\n      contentGuidelinesBestPractices: '',\n    };"
);

// 2. Add new Section UI elements after Diretrizes section in modal
c = c.replace(
  /            <Field label="Elementos obrigat\u00f3rios \(v\u00edrgula separada\)" value=\{form.constraintsRequiredElements\} onChange=\{\(v\) => \{ form.constraintsRequiredElements = v; \}\} \/>\r?\n          <\/Section>\r?\n          <div className="flex justify-end gap-3/,
  '            <Field label="Elementos obrigat\u00f3rios (v\u00edrgula separada)" value={form.constraintsRequiredElements} onChange={(v) => { form.constraintsRequiredElements = v; }} />\n          </Section>\n          <Section title="Comunica\u00e7\u00e3o da Marca">\n            <Field label="Valores da marca (v\u00edrgula separada)" value={form.messagingBrandValues} onChange={(v) => { form.messagingBrandValues = v; }} />\n            <Field label="Hist\u00f3ria da marca" value={form.messagingBrandStory} onChange={(v) => { form.messagingBrandStory = v; }} textarea />\n            <Field label="Concorrentes (v\u00edrgula separada)" value={form.messagingCompetitors} onChange={(v) => { form.messagingCompetitors = v; }} />\n            <Field label="Pilares de comunica\u00e7\u00e3o (v\u00edrgula separada)" value={form.messagingPillars} onChange={(v) => { form.messagingPillars = v; }} />\n            <Field label="Chamadas para a\u00e7\u00e3o (v\u00edrgula separada)" value={form.messagingKeyCTAs} onChange={(v) => { form.messagingKeyCTAs = v; }} />\n            <Field label="Gatilhos emocionais (v\u00edrgula separada)" value={form.messagingEmotionalTriggers} onChange={(v) => { form.messagingEmotionalTriggers = v; }} />\n          </Section>\n          <Section title="Diretrizes de Conte\u00fado">\n            <Field label="Tamanho dos posts" value={form.contentGuidelinesPostLengthHint} onChange={(v) => { form.contentGuidelinesPostLengthHint = v; }} />\n            <Field label="Uso de emojis" value={form.contentGuidelinesEmojiUsage} onChange={(v) => { form.contentGuidelinesEmojiUsage = v; }} />\n            <Field label="Estrat\u00e9gia de hashtags (v\u00edrgula separada)" value={form.contentGuidelinesHashtagStrategy} onChange={(v) => { form.contentGuidelinesHashtagStrategy = v; }} />\n            <Field label="Mix de conte\u00fado (v\u00edrgula separada)" value={form.contentGuidelinesContentMix} onChange={(v) => { form.contentGuidelinesContentMix = v; }} />\n            <Field label="Melhores pr\u00e1ticas (v\u00edrgula separada)" value={form.contentGuidelinesBestPractices} onChange={(v) => { form.contentGuidelinesBestPractices = v; }} />\n          </Section>\n          <div className="flex justify-end gap-3'
);

// 3. Add messaging + contentGuidelines to the save payload
c = c.replace(
  /                    requiredElements: form.constraintsRequiredElements.split\(','\)\.map\(s => s\.trim\(\)\)\.filter\(Boolean\),\r?\n                  \},\r?\n                \}\);/,
  '                    requiredElements: form.constraintsRequiredElements.split(\',\').map(s => s.trim()).filter(Boolean),\n                  },\n                  messaging: {\n                    brandValues: form.messagingBrandValues.split(\',\').map(s => s.trim()).filter(Boolean),\n                    brandStory: form.messagingBrandStory,\n                    competitors: form.messagingCompetitors.split(\',\').map(s => s.trim()).filter(Boolean),\n                    messagingPillars: form.messagingPillars.split(\',\').map(s => s.trim()).filter(Boolean),\n                    keyCTAs: form.messagingKeyCTAs.split(\',\').map(s => s.trim()).filter(Boolean),\n                    emotionalTriggers: form.messagingEmotionalTriggers.split(\',\').map(s => s.trim()).filter(Boolean),\n                  },\n                  contentGuidelines: {\n                    postLengthHint: form.contentGuidelinesPostLengthHint,\n                    emojiUsage: form.contentGuidelinesEmojiUsage,\n                    hashtagStrategy: form.contentGuidelinesHashtagStrategy.split(\',\').map(s => s.trim()).filter(Boolean),\n                    contentMix: form.contentGuidelinesContentMix.split(\',\').map(s => s.trim()).filter(Boolean),\n                    bestPractices: form.contentGuidelinesBestPractices.split(\',\').map(s => s.trim()).filter(Boolean),\n                  },\n                });'
);

// Write back with consistent line endings
fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('All modal fields + payload updated');
console.log('Has messaging form fields:', c.includes('messagingBrandValues'));
console.log('Has contentGuidelines form fields:', c.includes('contentGuidelinesPostLengthHint'));
console.log('Has messaging in save payload:', c.includes('messaging: {'));
console.log('Has contentGuidelines in save payload:', c.includes('contentGuidelines: {'));
