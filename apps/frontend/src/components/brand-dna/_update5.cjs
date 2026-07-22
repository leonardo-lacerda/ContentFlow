const fs = require('fs');
const f = 'C:/Users/Leo/Documents/ContentFlow/apps/frontend/src/components/brand-dna/dna-snapshot-list.component.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/\r\n/g, '\n');

// 1. Update destructuring
c = c.replace(
  "const { summary, voice, audience, offer, visual, constraints, confidence } =\n    snapshot;",
  "const { summary, voice, audience, offer, visual, constraints, confidence, messaging, contentGuidelines } =\n    snapshot;"
);

// 2. After the Diretrizes Section (</Section> after requiredElements) and before the Confidence section, add messaging sections
// Find the Diretrizes closing </Section> and insert before it
const diretrizesEnd = '      </Section>\n\n      {confidence && (';
c = c.replace(
  '      </Section>\n\n      {confidence && (',
  '      </Section>\n\n      {/* Messaging */}\n      {messaging && (messaging.brandValues?.length > 0 || messaging.brandStory || messaging.messagingPillars?.length > 0 || messaging.keyCTAs?.length > 0) && (\n        <Section title="Comunica\u00e7\u00e3o da Marca">\n          <ListField label="Valores da marca" items={messaging.brandValues} />\n          {messaging.brandStory && <div className="mb-1.5 italic">&ldquo;{messaging.brandStory}&rdquo;</div>}\n          <ListField label="Pilares de comunica\u00e7\u00e3o" items={messaging.messagingPillars} />\n          <ListField label="Chamadas para a\u00e7\u00e3o" items={messaging.keyCTAs} />\n          <ListField label="Gatilhos emocionais" items={messaging.emotionalTriggers} />\n        </Section>\n      )}\n\n      {/* Competitors */}\n      {messaging?.competitors && messaging.competitors.length > 0 && (\n        <Section title="Concorrentes Identificados">\n          <ListField label="" items={messaging.competitors} />\n        </Section>\n      )}\n\n      {/* Content Guidelines */}\n      {contentGuidelines && (contentGuidelines.postLengthHint || contentGuidelines.emojiUsage || contentGuidelines.hashtagStrategy?.length > 0 || contentGuidelines.contentMix?.length > 0 || contentGuidelines.bestPractices?.length > 0) && (\n        <Section title="Diretrizes de Conte\u00fado">\n          {contentGuidelines.postLengthHint && <Field label="Tamanho dos posts" value={contentGuidelines.postLengthHint} />}\n          {contentGuidelines.emojiUsage && <Field label="Uso de emojis" value={contentGuidelines.emojiUsage} />}\n          <ListField label="Estrat\u00e9gia de hashtags" items={contentGuidelines.hashtagStrategy} />\n          <ListField label="Mix de conte\u00fado" items={contentGuidelines.contentMix} />\n          <ListField label="Melhores pr\u00e1ticas" items={contentGuidelines.bestPractices} />\n        </Section>\n      )}\n\n      {confidence && ('
);

fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('SnapshotModalView updated');
console.log('Has messaging in destructure:', c.includes('messaging, contentGuidelines'));
console.log('Has Comunicação da Marca:', c.includes('Comunica'));
console.log('Has Diretrizes de Conteúdo:', c.includes('Diretrizes de Conte'));
