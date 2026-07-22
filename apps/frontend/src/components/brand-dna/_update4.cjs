const fs = require('fs');
const f2 = 'C:/Users/Leo/Documents/ContentFlow/apps/frontend/src/components/brand-dna/dna-snapshot-list.component.tsx';
let c = fs.readFileSync(f2, 'utf8');
c = c.replace(/\r\n/g, '\n');

// Find the position right after the constraints section and before the closing </div>
const constraintsEnd = `            )}
          </div>
        </div>
      )}

      {/* Voice & Audience */}
`;

const newSections = `            )}
          </div>
        </div>
      )}

      {/* Messaging Pillars */}
      {snapshot.messaging && (snapshot.messaging.brandValues?.length > 0 || snapshot.messaging.brandStory || snapshot.messaging.messagingPillars?.length > 0 || snapshot.messaging.keyCTAs?.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Comunicação da Marca</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            {snapshot.messaging.brandValues && snapshot.messaging.brandValues.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-purple-400 uppercase mb-[4px]">Valores</div>
                <div className="flex flex-wrap gap-[4px]">
                  {snapshot.messaging.brandValues.map((v: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {snapshot.messaging.brandStory && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-[600] text-amber-400 uppercase mb-[4px]">História da Marca</div>
                <div className="text-[12px] text-textColor leading-relaxed italic">&ldquo;{snapshot.messaging.brandStory}&rdquo;</div>
              </div>
            )}
            {snapshot.messaging.messagingPillars && snapshot.messaging.messagingPillars.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-cyan-400 uppercase mb-[4px]">Pilares de Comunicação</div>
                <div className="flex flex-col gap-[3px]">
                  {snapshot.messaging.messagingPillars.map((p: string, i: number) => (
                    <div key={i} className="text-[12px] text-textColor flex items-start gap-1"><span className="text-cyan-400 shrink-0">&#9670;</span> {p}</div>
                  ))}
                </div>
              </div>
            )}
            {snapshot.messaging.keyCTAs && snapshot.messaging.keyCTAs.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-pink-400 uppercase mb-[4px]">Chamadas para Ação</div>
                <div className="flex flex-wrap gap-[4px]">
                  {snapshot.messaging.keyCTAs.map((cta: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30">{cta}</span>
                  ))}
                </div>
              </div>
            )}
            {snapshot.messaging.emotionalTriggers && snapshot.messaging.emotionalTriggers.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-rose-400 uppercase mb-[4px]">Gatilhos Emocionais</div>
                <div className="flex flex-wrap gap-[4px]">
                  {snapshot.messaging.emotionalTriggers.map((t: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competitors */}
      {snapshot.messaging?.competitors && snapshot.messaging.competitors.length > 0 && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Concorrentes Identificados</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
            {snapshot.messaging.competitors.map((comp: string, i: number) => (
              <div key={i} className="flex items-center gap-2 p-[8px] rounded-[8px] bg-newSettings border border-newTableBorder">
                <div className="w-[28px] h-[28px] rounded-full bg-orange-500/15 flex items-center justify-center text-[11px] font-bold text-orange-300">{comp.charAt(0).toUpperCase()}</div>
                <span className="text-[12px] text-textColor font-medium truncate">{comp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Guidelines */}
      {snapshot.contentGuidelines && (snapshot.contentGuidelines.postLengthHint || snapshot.contentGuidelines.emojiUsage || snapshot.contentGuidelines.hashtagStrategy?.length > 0 || snapshot.contentGuidelines.contentMix?.length > 0 || snapshot.contentGuidelines.bestPractices?.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Diretrizes de Conteúdo</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            {snapshot.contentGuidelines.postLengthHint && (
              <div>
                <div className="text-[10px] font-[600] text-blue-300 uppercase mb-[4px]">Tamanho dos Posts</div>
                <div className="text-[12px] text-textColor">{snapshot.contentGuidelines.postLengthHint}</div>
              </div>
            )}
            {snapshot.contentGuidelines.emojiUsage && (
              <div>
                <div className="text-[10px] font-[600] text-yellow-300 uppercase mb-[4px]">Uso de Emojis</div>
                <div className="text-[12px] text-textColor">{snapshot.contentGuidelines.emojiUsage}</div>
              </div>
            )}
            {snapshot.contentGuidelines.hashtagStrategy && snapshot.contentGuidelines.hashtagStrategy.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-indigo-300 uppercase mb-[4px]">Estratégia de Hashtags</div>
                <div className="flex flex-wrap gap-[4px]">
                  {snapshot.contentGuidelines.hashtagStrategy.map((h: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">{h}</span>
                  ))}
                </div>
              </div>
            )}
            {snapshot.contentGuidelines.contentMix && snapshot.contentGuidelines.contentMix.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-teal-300 uppercase mb-[4px]">Mix de Conteúdo</div>
                <div className="flex flex-col gap-[3px]">
                  {snapshot.contentGuidelines.contentMix.map((m: string, i: number) => (
                    <div key={i} className="text-[12px] text-textColor flex items-start gap-1"><span className="text-teal-300 shrink-0">&#9654;</span> {m}</div>
                  ))}
                </div>
              </div>
            )}
            {snapshot.contentGuidelines.bestPractices && snapshot.contentGuidelines.bestPractices.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-[600] text-lime-300 uppercase mb-[4px]">Melhores Práticas</div>
                <div className="flex flex-wrap gap-[4px]">
                  {snapshot.contentGuidelines.bestPractices.map((bp: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-lime-500/15 text-lime-300 border border-lime-500/30">{bp}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice & Audience */}
`;

c = c.replace(constraintsEnd, newSections);

fs.writeFileSync(f2, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('Snapshot list modal updated');
console.log('Has messaging sections:', c.includes('Comunicação da Marca'));
console.log('Has contentGuidelines sections:', c.includes('Diretrizes de Conteúdo'));
console.log('Has competitors:', c.includes('Concorrentes Identificados'));
