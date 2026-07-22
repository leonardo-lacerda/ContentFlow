const fs = require('fs');
const f = 'C:/Users/Leo/Documents/ContentFlow/apps/frontend/src/components/brand-dna/brand-detail-page.component.tsx';
let c = fs.readFileSync(f, 'utf8');

const startMarker = 'function DnaSummaryCard({ dna }: { dna: any }) {';
const startIdx = c.indexOf(startMarker);
const endMarker = '\nfunction BrandHealthBar';
const endIdx = c.indexOf(endMarker);

console.log('DnaSummaryCard starts at:', startIdx);
console.log('BrandHealthBar starts at:', endIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers');
  process.exit(1);
}

const before = c.substring(0, startIdx);
const after = c.substring(endIdx);

const newDnaSummaryCard = `function DnaSummaryCard({ dna }: { dna: any }) {
  if (!dna) return null;
  const { summary, voice, audience, offer, visual, constraints, messaging, contentGuidelines, confidence } = dna;
  return (
    <div className="flex flex-col gap-[16px]">
      {/* Tagline & Description */}
      {summary && (
        <div className="border border-newTableBorder rounded-[10px] p-[14px] bg-gradient-to-br from-newBgColorInner to-transparent">
          {summary.tagline && <div className="text-[14px] font-[700] text-newTextColor mb-[4px]">{summary.tagline}</div>}
          {summary.description && <div className="text-[12px] text-textItemBlur leading-relaxed line-clamp-3">{summary.description}</div>}
          <div className="flex flex-wrap gap-[6px] mt-[8px]">
            {summary.industry && <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-newSettings border border-newTableBorder text-textItemBlur">{summary.industry}</span>}
            {summary.targetAudience && <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-newSettings border border-newTableBorder text-textItemBlur">{summary.targetAudience}</span>}
          </div>
        </div>
      )}

      {/* Confidence Scores */}
      {confidence && (
        <div className="border border-newTableBorder rounded-[10px] p-[14px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[10px]">Scores de Confianca</div>
          <div className="flex flex-col gap-[8px]">
            <ConfidenceBar label="Geral" value={confidence.overall} />
            <ConfidenceBar label="Textual" value={confidence.textual} />
            <ConfidenceBar label="Visual" value={confidence.visual} />
            <ConfidenceBar label="Comercial" value={confidence.commercial} />
          </div>
        </div>
      )}

      {/* Quick DNA Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
        {/* Voice */}
        {voice && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Voz da Marca</div>
            <div className="flex flex-col gap-[4px]">
              {voice.tone && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Tom:</span> {voice.tone}</div>}
              {voice.style && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Estilo:</span> {voice.style}</div>}
              {voice.personality && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Personalidade:</span> {voice.personality}</div>}
              {voice.forbiddenWords && voice.forbiddenWords.length > 0 && (
                <div className="text-[11px] text-red-400 mt-[4px]">Evitar: {voice.forbiddenWords.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Audience */}
        {audience && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Publico</div>
            <div className="flex flex-col gap-[4px]">
              {audience.demographics && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Demografia:</span> {audience.demographics}</div>}
              {audience.painPoints && audience.painPoints.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Dores:</span> {audience.painPoints.join(', ')}</div>}
              {audience.desires && audience.desires.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Desejos:</span> {audience.desires.join(', ')}</div>}
            </div>
          </div>
        )}

        {/* Offer */}
        {offer && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Oferta</div>
            <div className="flex flex-col gap-[4px]">
              {offer.products && offer.products.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Produtos:</span> {offer.products.join(', ')}</div>}
              {offer.services && offer.services.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Servicos:</span> {offer.services.join(', ')}</div>}
              {offer.uniqueSellingPoints && offer.uniqueSellingPoints.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Diferenciais:</span> {offer.uniqueSellingPoints.join(', ')}</div>}
              {offer.pricingHint && <div className="text-[12px] text-textItemBlur italic">Preco: {offer.pricingHint}</div>}
            </div>
          </div>
        )}

        {/* Visual Identity */}
        {visual && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Identidade Visual</div>
            <div className="flex flex-col gap-[4px]">
              {visual.colors && visual.colors.length > 0 && (
                <div className="flex items-center gap-[6px]">
                  <span className="text-[12px] text-newTextColor font-[600]">Cores:</span>
                  <div className="flex gap-[4px]">
                    {visual.colors.map((c: string, i: number) => (
                      <span key={i} className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-newTableBorder shadow-sm" style={{ backgroundColor: c }} title={c}>
                        <span className="text-[8px] font-bold mix-blend-difference text-white">{c.length > 0 ? '' : ''}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {visual.style && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Estilo:</span> {visual.style}</div>}
              {visual.typographyHint && <div className="text-[12px] text-textItemBlur italic">Tipografia: {visual.typographyHint}</div>}
              {visual.photographyStyle && <div className="text-[12px] text-textItemBlur italic">Fotografia: {visual.photographyStyle}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Constraints */}
      {constraints && (constraints.do.length > 0 || constraints.avoid.length > 0 || constraints.requiredElements.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Diretrizes</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
            {constraints.do.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-green-400 uppercase mb-[4px]">Fazer</div>
                {constraints.do.map((item: string, i: number) => <div key={i} className="text-[12px] text-newTextColor">+ {item}</div>)}
              </div>
            )}
            {constraints.avoid.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-red-400 uppercase mb-[4px]">Evitar</div>
                {constraints.avoid.map((item: string, i: number) => <div key={i} className="text-[12px] text-newTextColor">- {item}</div>)}
              </div>
            )}
            {constraints.requiredElements.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-blue-400 uppercase mb-[4px]">Obrigatorio</div>
                {constraints.requiredElements.map((item: string, i: number) => <div key={i} className="text-[12px] text-newTextColor">* {item}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messaging Pillars */}
      {messaging && (messaging.brandValues?.length > 0 || messaging.brandStory || messaging.messagingPillars?.length > 0 || messaging.keyCTAs?.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Comunicacao da Marca</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            {messaging.brandValues && messaging.brandValues.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-purple-400 uppercase mb-[4px]">Valores</div>
                <div className="flex flex-wrap gap-[4px]">
                  {messaging.brandValues.map((v: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {messaging.brandStory && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-[600] text-amber-400 uppercase mb-[4px]">Historia da Marca</div>
                <div className="text-[12px] text-newTextColor leading-relaxed italic">&ldquo;{messaging.brandStory}&rdquo;</div>
              </div>
            )}
            {messaging.messagingPillars && messaging.messagingPillars.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-cyan-400 uppercase mb-[4px]">Pilares de Comunicacao</div>
                <div className="flex flex-col gap-[3px]">
                  {messaging.messagingPillars.map((p: string, i: number) => (
                    <div key={i} className="text-[12px] text-newTextColor flex items-start gap-1"><span className="text-cyan-400 shrink-0">&#9670;</span> {p}</div>
                  ))}
                </div>
              </div>
            )}
            {messaging.keyCTAs && messaging.keyCTAs.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-pink-400 uppercase mb-[4px]">Chamadas para Acao</div>
                <div className="flex flex-wrap gap-[4px]">
                  {messaging.keyCTAs.map((cta: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30">{cta}</span>
                  ))}
                </div>
              </div>
            )}
            {messaging.emotionalTriggers && messaging.emotionalTriggers.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-rose-400 uppercase mb-[4px]">Gatilhos Emocionais</div>
                <div className="flex flex-wrap gap-[4px]">
                  {messaging.emotionalTriggers.map((t: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competitors */}
      {messaging?.competitors && messaging.competitors.length > 0 && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Concorrentes Identificados</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
            {messaging.competitors.map((comp: string, i: number) => (
              <div key={i} className="flex items-center gap-2 p-[8px] rounded-[8px] bg-newSettings border border-newTableBorder">
                <div className="w-[28px] h-[28px] rounded-full bg-orange-500/15 flex items-center justify-center text-[11px] font-bold text-orange-300">{comp.charAt(0).toUpperCase()}</div>
                <span className="text-[12px] text-newTextColor font-medium truncate">{comp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Guidelines */}
      {contentGuidelines && (contentGuidelines.postLengthHint || contentGuidelines.emojiUsage || contentGuidelines.hashtagStrategy?.length > 0 || contentGuidelines.contentMix?.length > 0 || contentGuidelines.bestPractices?.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Diretrizes de Conteudo</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            {contentGuidelines.postLengthHint && (
              <div>
                <div className="text-[10px] font-[600] text-blue-300 uppercase mb-[4px]">Tamanho dos Posts</div>
                <div className="text-[12px] text-newTextColor">{contentGuidelines.postLengthHint}</div>
              </div>
            )}
            {contentGuidelines.emojiUsage && (
              <div>
                <div className="text-[10px] font-[600] text-yellow-300 uppercase mb-[4px]">Uso de Emojis</div>
                <div className="text-[12px] text-newTextColor">{contentGuidelines.emojiUsage}</div>
              </div>
            )}
            {contentGuidelines.hashtagStrategy && contentGuidelines.hashtagStrategy.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-indigo-300 uppercase mb-[4px]">Estrategia de Hashtags</div>
                <div className="flex flex-wrap gap-[4px]">
                  {contentGuidelines.hashtagStrategy.map((h: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">{h}</span>
                  ))}
                </div>
              </div>
            )}
            {contentGuidelines.contentMix && contentGuidelines.contentMix.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-teal-300 uppercase mb-[4px]">Mix de Conteudo</div>
                <div className="flex flex-col gap-[3px]">
                  {contentGuidelines.contentMix.map((m: string, i: number) => (
                    <div key={i} className="text-[12px] text-newTextColor flex items-start gap-1"><span className="text-teal-300 shrink-0">&#9654;</span> {m}</div>
                  ))}
                </div>
              </div>
            )}
            {contentGuidelines.bestPractices && contentGuidelines.bestPractices.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-[600] text-lime-300 uppercase mb-[4px]">Melhores Praticas</div>
                <div className="flex flex-wrap gap-[4px]">
                  {contentGuidelines.bestPractices.map((bp: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-lime-500/15 text-lime-300 border border-lime-500/30">{bp}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`;

const result = before + newDnaSummaryCard + after;
fs.writeFileSync(f, result, 'utf8');
console.log('Updated DnaSummaryCard successfully');
