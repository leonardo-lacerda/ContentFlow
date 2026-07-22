const fs = require('fs');
const f = 'C:/Users/Leo/Documents/ContentFlow/apps/frontend/src/components/brand-dna/brand-dna.types.ts';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/\r\n/g, '\n');

// Add messaging and contentGuidelines to BrandDnaSnapshot if not present
if (!c.includes('messaging')) {
  // Find the closing of the constraints property and add messaging after it
  const oldConstraints = /constraints\?\:\s*\{[^}]+\}/;
  const match = c.match(oldConstraints);
  if (match) {
    const insertAfter = match[0];
    c = c.replace(insertAfter, insertAfter + ';\n  messaging?: BrandDnaMessaging;\n  contentGuidelines?: BrandDnaContentGuidelines');
  }
}

// Add the new interfaces if not present
if (!c.includes('BrandDnaMessaging')) {
  const appendTypes = `

export interface BrandDnaMessaging {
  brandValues?: string[];
  brandStory?: string;
  competitors?: string[];
  messagingPillars?: string[];
  keyCTAs?: string[];
  emotionalTriggers?: string[];
}

export interface BrandDnaContentGuidelines {
  postLengthHint?: string;
  emojiUsage?: string;
  hashtagStrategy?: string[];
  contentMix?: string[];
  bestPractices?: string[];
}
`;
  c += appendTypes;
}

fs.writeFileSync(f, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('Types updated');
console.log('Has BrandDnaMessaging:', c.includes('BrandDnaMessaging'));
console.log('Has BrandDnaContentGuidelines:', c.includes('BrandDnaContentGuidelines'));
