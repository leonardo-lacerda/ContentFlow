
(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));

/* scroll: progress + nav + mobile cta */
const progress=$('#progress'), nav=$('#nav'), mobileCta=$('#mobileCta');
let ticking=false;
function onScroll(){
  const h=document.documentElement;
  progress.style.transform='scaleX('+(h.scrollTop/((h.scrollHeight-h.clientHeight)||1))+')';
  nav.classList.toggle('scrolled',h.scrollTop>8);
  mobileCta.classList.toggle('show',h.scrollTop>640);
  ticking=false;
}
window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(onScroll);ticking=true;}},{passive:true});
onScroll();

/* mobile menu */
const menuBtn=$('#menuBtn');
menuBtn.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  $('#navLinks').classList.toggle('open',open);
  menuBtn.setAttribute('aria-expanded',open);
});
$$('#navLinks a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');$('#navLinks').classList.remove('open');menuBtn.setAttribute('aria-expanded','false');}));

/* reveals + counters */
const io=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(e.isIntersecting){
      const d=e.target.dataset.delay; if(d) e.target.style.transitionDelay=d+'ms';
      e.target.classList.add('in'); io.unobserve(e.target);
    }
  });
},{threshold:.14});
$$('.reveal').forEach(el=>io.observe(el));

function easeOut(t){return 1-Math.pow(1-t,3);}
const cio=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(!e.isIntersecting) return;
    const el=e.target, target=+el.dataset.count, dur=1300, t0=performance.now();
    (function tick(t){const p=Math.min(1,(t-t0)/dur);el.textContent=Math.round(target*easeOut(p));if(p<1)requestAnimationFrame(tick);})(t0);
    cio.unobserve(el);
  });
},{threshold:.5});
$$('[data-count]').forEach(el=>cio.observe(el));

/* marquee clone */
const mq=$('#mqTrack');
mq.appendChild(mq.firstElementChild.cloneNode(true));
mq.appendChild(mq.firstElementChild.cloneNode(true));

/* ============ DEMO PLAYER ============ */
const player=$('#player'), pProg=$('#pProg'), playBtn=$('#playBtn'), chips=$$('.pstep');
const DURS=[7000,7500,8000,7000];
const TOTAL=DURS.reduce((a,b)=>a+b,0);
const reduceMq=window.matchMedia('(prefers-reduced-motion: reduce)');
let pCur=0, pElapsed=0, pInview=false, pUserPaused=false, pStarted=false, pLast=0;
function setStep(i){
  pCur=i; pElapsed=0;
  player.dataset.step='0'; void player.offsetWidth;
  player.dataset.step=String(i+1);
  chips.forEach((c,idx)=>c.classList.toggle('on',idx===i));
  updateProg();
}
function updateProg(){
  let acc=0; for(let k=0;k<pCur;k++)acc+=DURS[k];
  pProg.style.width=Math.min(100,((acc+Math.min(pElapsed,DURS[pCur]))/TOTAL)*100)+'%';
}
function pTick(t){
  if(!pLast)pLast=t;
  const dt=Math.min(64,t-pLast); pLast=t;
  if(pStarted&&pInview&&!pUserPaused&&!reduceMq.matches){
    pElapsed+=dt;
    if(pElapsed>=DURS[pCur]) setStep((pCur+1)%DURS.length);
    else updateProg();
  }
  requestAnimationFrame(pTick);
}
requestAnimationFrame(pTick);
chips.forEach((c,i)=>c.addEventListener('click',()=>{pStarted=true;setStep(i);}));
playBtn.addEventListener('click',()=>{
  pUserPaused=!pUserPaused;
  playBtn.innerHTML=pUserPaused?'▶':'❚❚';
  playBtn.setAttribute('aria-label',pUserPaused?'Continuar demo':'Pausar demo');
  if(!pUserPaused&&!pStarted){pStarted=true;setStep(0);}
});
$('#pIdle').addEventListener('click',()=>{pStarted=true;setStep(0);});
new IntersectionObserver(es=>{es.forEach(e=>{pInview=e.isIntersecting;});},{threshold:.3}).observe(player);

/* ============ NICHE DATA ============ */
const NICHES={
  mentoria:{em:"🎯",name:"mentoria & infoproduto",
    ideas:[
      {e:"🧠",h:"5 crenças que travam quem quer vender a primeira mentoria",tag:"carrossel · 8 artes",funnel:"topo",goal:"autoridade"},
      {e:"🚀",h:"O erro nº 1 de quem lança infoproduto sem audiência",tag:"post único",funnel:"meio",goal:"opinião"},
      {e:"🎬",h:"Bastidores: preparei a última turma em 14 dias. Te mostro como",tag:"ideia de reel",funnel:"topo",goal:"conexão"},
      {e:"💰",h:"3 sinais de que o lead tá pronto pra comprar (e você tá deixando passar)",tag:"carrossel · 6 artes",funnel:"fundo",goal:"venda"},
      {e:"💬",h:"Pergunta de DM que virou conteúdo: 'preciso de CNPJ pra vender?'",tag:"post único",funnel:"topo",goal:"engajamento"},
      {e:"📈",h:"De R$ 0 a R$ 10k/mês: o antes e depois de um aluno (com números)",tag:"carrossel · 7 artes",funnel:"fundo",goal:"prova social"}
    ],
    samples:[
      {type:"carrossel · 8 artes",day:"seg · 08h",text:"Todo mundo fala de 'viver de internet'. Ninguém fala do primeiro boleto que quase não veio. Nesse carrossel, 5 crenças que travam a primeira venda — e o que eu faria diferente."},
      {type:"post único",day:"qua · 12h",text:"Lançar sem audiência não é problema. Problema é lançar sem conversar com ninguém antes. 30 conversas no DM valem mais que 300 seguidores."},
      {type:"ideia de reel",day:"sex · 18h",text:"14 dias até a abertura da turma. Mostrei o processo inteiro: página, e-mail, roteiro de live. Salva esse reel."}
    ],
    carousel:["5 crenças que travam sua 1ª mentoria 🧠","1. 'Preciso de 10k seguidores' — precisa de 10 conversas","2. 'Ninguém paga por conhecimento' — pagam por transformação","Turma nova abre quinta. Link na bio ⚡"]
  },
  freela:{em:"💻",name:"freela & serviços",
    ideas:[
      {e:"💸",h:"Como eu dobrei meu valor/hora sem perder cliente",tag:"carrossel · 7 artes",funnel:"meio",goal:"autoridade"},
      {e:"📩",h:"O template de proposta que fecha 7 em 10 orçamentos",tag:"carrossel · 6 artes",funnel:"fundo",goal:"leads"},
      {e:"🚫",h:"3 red flags de cliente que eu aprendi a recusar",tag:"post único",funnel:"topo",goal:"engajamento"},
      {e:"⏱️",h:"Um dia inteiro de trabalho em 30 segundos (time-lapse real)",tag:"ideia de reel",funnel:"topo",goal:"bastidores"},
      {e:"🧾",h:"Tabela de preços: por que a minha não existe mais",tag:"post único",funnel:"meio",goal:"opinião"},
      {e:"🤝",h:"Cliente que virou case: 6 meses de projeto em 1 post",tag:"carrossel · 8 artes",funnel:"fundo",goal:"prova social"}
    ],
    samples:[
      {type:"carrossel · 7 artes",day:"ter · 09h",text:"Passei 2 anos cobrando barato por medo de perder cliente. Até entender que cliente que some por preço nunca foi cliente. O que eu mudei (com exemplos reais):"},
      {type:"post único",day:"qui · 12h",text:"Orçamento não é tabela de preços. É proposta de valor. Manda esse post pro próximo cliente que pedir 'quanto custa'."},
      {type:"ideia de reel",day:"sáb · 11h",text:"6h de projeto em 30s. Spoiler: 80% do tempo é pensar, 20% é executar."}
    ],
    carousel:["O template de proposta que fecha 7/10 📩","1. Diagnóstico antes do preço","2. Escopo em 3 cenários (bom, melhor, ideal)","Agenda aberta pra outubro — DM 'PROPOSTA'"]
  },
  consultoria:{em:"📈",name:"consultoria",
    ideas:[
      {e:"🔍",h:"Auditoria relâmpago: 5 pontos que eu olho nos primeiros 10 min",tag:"carrossel · 8 artes",funnel:"topo",goal:"autoridade"},
      {e:"📊",h:"O dashboard que eu monto pra todo cliente (copia o modelo)",tag:"carrossel · 6 artes",funnel:"meio",goal:"leads"},
      {e:"⚠️",h:"Sinal de alerta: quando o problema NÃO é tráfego",tag:"post único",funnel:"meio",goal:"opinião"},
      {e:"🎙️",h:"Respondi as 3 dúvidas que mais chegam na consultoria",tag:"ideia de reel",funnel:"topo",goal:"engajamento"},
      {e:"🧮",h:"Case: como um ajuste de oferta aumentou conversão em 41%",tag:"carrossel · 7 artes",funnel:"fundo",goal:"prova social"},
      {e:"🗓️",h:"Agenda de consultoria: 2 vagas esse mês. É assim que eu escolho",tag:"post único",funnel:"fundo",goal:"venda"}
    ],
    samples:[
      {type:"carrossel · 8 artes",day:"seg · 08h",text:"Nos primeiros 10 minutos de uma auditoria eu já sei onde tá o vazamento. Não é mágica — é checklist. Os 5 pontos que eu olho primeiro:"},
      {type:"post único",day:"qua · 12h",text:"'Meu tráfego não converte.' Às vezes o problema é a oferta. Às vezes é o preço. Às vezes é o atendimento. Tráfego é só o mensageiro."},
      {type:"ideia de reel",day:"sex · 17h",text:"As 3 dúvidas que mais recebo na consultoria, respondidas em 60s. A #2 surpreende todo mundo."}
    ],
    carousel:["O dashboard que eu monto pra todo cliente 📊","1. CAC e LTV lado a lado, sempre","2. Uma métrica norte por trimestre","Comenta 'MODELO' que eu te mando o template"]
  },
  agencia:{em:"🚀",name:"agência digital",
    ideas:[
      {e:"🗂️",h:"Como a gente gerencia 8 clientes sem enlouquecer (processo completo)",tag:"carrossel · 8 artes",funnel:"topo",goal:"autoridade"},
      {e:"📋",h:"Briefing que economiza 3 reuniões: as 7 perguntas certas",tag:"carrossel · 6 artes",funnel:"meio",goal:"leads"},
      {e:"🤖",h:"IA no fluxo da agência: o que a gente automatizou (e o que não)",tag:"post único",funnel:"topo",goal:"opinião"},
      {e:"🏆",h:"Case: de 4k pra 27k seguidores em 6 meses — sem viralizar",tag:"carrossel · 7 artes",funnel:"fundo",goal:"prova social"},
      {e:"💼",h:"Precificação de job: a conta que ninguém te ensina",tag:"post único",funnel:"meio",goal:"engajamento"},
      {e:"🎬",h:"Um dia na agência: caos organizado em 30 segundos",tag:"ideia de reel",funnel:"topo",goal:"bastidores"}
    ],
    samples:[
      {type:"carrossel · 8 artes",day:"ter · 09h",text:"8 clientes, 2 pessoas, zero burnout. Não é talento — é processo. O nosso sistema de conteúdo de ponta a ponta:"},
      {type:"post único",day:"qui · 12h",text:"Briefing bom não é formulário longo. São 7 perguntas que evitam 3 reuniões de alinhamento. Comenta 'BRIEFING' que eu mando."},
      {type:"ideia de reel",day:"sáb · 10h",text:"Um dia na agência em 30s: call, criação, aprovação, entrega. Spoiler: o café é personagem principal."}
    ],
    carousel:["Como gerenciamos 8 clientes sem pirar 🗂️","1. Cada cliente = 1 DNA de marca separado","2. Aprovação em lote, 1x por semana","2 vagas pra novos clientes em agosto — DM"]
  },
  creator:{em:"🎬",name:"creator & UGC",
    ideas:[
      {e:"🎥",h:"O setup de R$ 300 que grava vídeo com cara de R$ 3.000",tag:"carrossel · 7 artes",funnel:"topo",goal:"autoridade"},
      {e:"📱",h:"3 ganchos que seguram os 3 primeiros segundos (com exemplos)",tag:"carrossel · 6 artes",funnel:"topo",goal:"engajamento"},
      {e:"💌",h:"Como eu fecho parceria com marca pequena (script de DM real)",tag:"carrossel · 6 artes",funnel:"meio",goal:"leads"},
      {e:"🫣",h:"Vergonha de gravar? O que ninguém te conta sobre o começo",tag:"post único",funnel:"topo",goal:"conexão"},
      {e:"📉",h:"Meu vídeo flopou. O que eu aprendi analisando a retenção",tag:"post único",funnel:"meio",goal:"bastidores"},
      {e:"🛠️",h:"UGC: o que a marca quer receber de você (checklist)",tag:"carrossel · 8 artes",funnel:"fundo",goal:"venda"}
    ],
    samples:[
      {type:"carrossel · 7 artes",day:"seg · 08h",text:"Gastei R$ 300 e parei de invejar setup alheio. Luz, áudio e enquadramento — o que realmente importa (e o que é frescura):"},
      {type:"post único",day:"qua · 12h",text:"Seu vídeo não flopou pelo algoritmo. Flopou nos 3 primeiros segundos. Gancho é 80% do jogo. Exemplos reais no carrossel de amanhã."},
      {type:"ideia de reel",day:"sex · 18h",text:"Script de DM que fechou minha primeira parceria paga. Copia, adapta, manda. Sem vergonha."}
    ],
    carousel:["3 ganchos que seguram os 3 primeiros s 🎥","1. 'Ninguém te conta isso sobre…'","2. 'Eu testei X por 30 dias. Resultado:'","Salva esse carrossel — volta aqui pra gravar ⚡"]
  },
  ecommerce:{em:"🛒",name:"e-commerce",
    ideas:[
      {e:"📦",h:"Unboxing que vende: o que o seu cliente filma sem você pedir",tag:"ideia de reel",funnel:"topo",goal:"conexão"},
      {e:"🛒",h:"Carrinho abandonado? 3 mensagens que recuperam (com copy)",tag:"carrossel · 7 artes",funnel:"fundo",goal:"venda"},
      {e:"⭐",h:"Review de cliente virou nosso melhor anúncio. Olha isso",tag:"post único",funnel:"meio",goal:"prova social"},
      {e:"🔥",h:"Lançamento de coleção: contagem regressiva que gera fila",tag:"carrossel · 6 artes",funnel:"meio",goal:"venda"},
      {e:"🤔",h:"Por que a gente parou de dar cupom em tudo",tag:"post único",funnel:"topo",goal:"opinião"},
      {e:"📊",h:"O número que a gente olha todo dia antes de qualquer anúncio",tag:"carrossel · 6 artes",funnel:"meio",goal:"autoridade"}
    ],
    samples:[
      {type:"carrossel · 7 artes",day:"ter · 09h",text:"Carrinho abandonado não é perda — é conversa começada. As 3 mensagens que a gente envia (com a copy exata de cada uma):"},
      {type:"post único",day:"qui · 12h",text:"Cupom em tudo ensina seu cliente a esperar cupom. O que a gente faz no lugar: valor percebido. Thread rápida:"},
      {type:"ideia de reel",day:"sáb · 10h",text:"Unboxing da última coleção 📦 O detalhe do bilhete escrito à mão fez 40 clientes postarem sozinhos."}
    ],
    carousel:["Carrinho abandonado? 3 mensagens que recuperam 🛒","1. 1h depois: 'esqueceu algo?' + prova social","2. 24h depois: urgência real, sem drama","Comenta 'COPY' que eu mando o template"]
  },
  outro:{em:"✨",name:"meu negócio digital",
    ideas:[
      {e:"🧭",h:"O guia que eu queria ter recebido quando comecei no digital",tag:"carrossel · 8 artes",funnel:"topo",goal:"autoridade"},
      {e:"🔁",h:"1 conteúdo, 5 formatos: meu sistema de reaproveitamento",tag:"carrossel · 6 artes",funnel:"meio",goal:"leads"},
      {e:"🫂",h:"Bastidores reais: o que ninguém mostra da vida de quem vende online",tag:"post único",funnel:"topo",goal:"conexão"},
      {e:"💡",h:"3 erros que eu cometi pra você não precisar cometer",tag:"carrossel · 7 artes",funnel:"meio",goal:"engajamento"},
      {e:"🎯",h:"Como eu escolho o próximo conteúdo em 5 minutos",tag:"post único",funnel:"topo",goal:"bastidores"},
      {e:"📬",h:"Lista de espera aberta: como entrar (e por que tem fila)",tag:"post único",funnel:"fundo",goal:"venda"}
    ],
    samples:[
      {type:"carrossel · 8 artes",day:"seg · 08h",text:"Se eu começasse hoje no digital, faria tudo diferente. Não por atalho — por economia de sofrimento. O guia que eu queria ter recebido:"},
      {type:"post único",day:"qua · 12h",text:"1 vídeo vira: 1 carrossel, 1 thread, 3 stories e 1 e-mail. Conteúdo não falta. O que falta é sistema de reaproveitamento."},
      {type:"ideia de reel",day:"sex · 18h",text:"Bastidores de uma semana de lançamento: 60h em 30s. A parte que ninguém mostra tá no final."}
    ],
    carousel:["1 conteúdo, 5 formatos: meu sistema 🔁","1. Grava 1x, corta em formatos nativos","2. Cada formato tem 1 CTA diferente","Comenta 'SISTEMA' que eu te mando o mapa"]
  }
};
const NICHE_ORDER=["mentoria","freela","consultoria","agencia","creator","ecommerce","outro"];
let currentNiche="mentoria";

function chipHTML(key){const n=NICHES[key];return '<button class="nchip'+(key===currentNiche?' active':'')+'" data-niche="'+key+'"><span class="em">'+n.em+'</span>'+n.name+'</button>';}
function renderChips(){
  $('#heroNiche').innerHTML=NICHE_ORDER.map(chipHTML).join('');
  $('#exNiche').innerHTML=NICHE_ORDER.map(chipHTML).join('');
  $$('.nchip').forEach(b=>b.addEventListener('click',()=>setNiche(b.dataset.niche)));
}
renderChips();

/* ============ SWIPE DECK ============ */
const deck=$('#deck'), deckEmpty=$('#deckEmpty'), deckLoading=$('#deckLoading');
const okCount=$('#okCount'), saveCount=$('#saveCount'), noCount=$('#noCount'), queueCount=$('#queueCount');
const winCta=$('#winCta');
let queue=[], stack=[], okN=0, saveN=0, noN=0, ideaN=0, busy=false;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function makeCard(idea,pos){
  const el=document.createElement('div');
  el.className='idea'; el.dataset.pos=pos; ideaN++;
  el.innerHTML=
    '<div class="idea-top"><span class="idea-emoji">'+idea.e+'</span><span class="idea-funnel f-'+idea.funnel+'">funil · '+idea.funnel+'</span><span class="idea-format">'+idea.tag+'</span></div>'+
    '<h3>'+idea.h+'</h3>'+
    '<span class="idea-goal">◎ '+idea.goal+'</span>'+
    '<div class="stamp st-ok">QUERO</div><div class="stamp st-no">NÃO</div><div class="stamp st-save">SALVA ★</div>';
  let sx=0,dx=0,drag=false;
  el.addEventListener('pointerdown',e=>{
    if(busy||el.dataset.pos!=='0') return;
    drag=true; sx=e.clientX; dx=0; el.classList.add('dragging');
    try{el.setPointerCapture(e.pointerId);}catch(err){}
  });
  el.addEventListener('pointermove',e=>{
    if(!drag) return; dx=e.clientX-sx;
    el.style.transform='translateX('+dx+'px) rotate('+(dx/16)+'deg)';
    el.classList.toggle('hint-r',dx>40); el.classList.toggle('hint-l',dx<-40);
  });
  const end=()=>{
    if(!drag) return; drag=false; el.classList.remove('dragging');
    if(Math.abs(dx)>90){fling(dx>0?1:-1);} else{el.style.transform='';el.classList.remove('hint-r','hint-l');}
    dx=0;
  };
  el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end);
  return el;
}
function initStack(){
  const n=Math.min(4,queue.length);
  for(let i=0;i<n;i++){deck.appendChild(makeCard(queue[i],i));stack.push(deck.lastElementChild);}
}
function updateHUD(){
  queueCount.textContent=queue.length;
  okCount.textContent=okN; saveCount.textContent=saveN; noCount.textContent=noN;
  const ready=okN+saveN; winCta.hidden=ready===0;
  if(ready>0) winCta.textContent='→ transformar '+ready+' ideia'+(ready>1?'s':'')+' em carrossel';
}
function fling(dir){
  if(busy||!stack.length) return; busy=true;
  const top=stack[0]; top.classList.remove('dragging','hint-l','hint-r'); top.style.transform='';
  if(dir===0){top.classList.add('fly-u');saveN++;}
  else if(dir>0){top.classList.add('fly-r');okN++;}
  else{top.classList.add('fly-l');noN++;}
  updateHUD();
  setTimeout(()=>{
    top.remove(); stack.shift(); queue.shift();
    if(queue.length===0){deckEmpty.hidden=false;}
    else{
      deckEmpty.hidden=true;
      if(queue.length>stack.length){deck.appendChild(makeCard(queue[3],3));stack.push(deck.lastElementChild);}
      stack.forEach((c,i)=>c.dataset.pos=i);
    }
    busy=false; updateHUD();
  },430);
}
function buildDeck(key){
  busy=false; deck.innerHTML=''; stack=[]; deckEmpty.hidden=true; deckLoading.hidden=true;
  queue=shuffle(NICHES[key].ideas.slice());
  initStack(); updateHUD();
}
$('#btnApprove').addEventListener('click',()=>fling(1));
$('#btnDiscard').addEventListener('click',()=>fling(-1));
$('#btnSave').addEventListener('click',()=>fling(0));
['btnApprove','btnDiscard','btnSave'].forEach(id=>$('#'+id).addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#'+id).click();}}));
winCta.addEventListener('click',openModal);
$('#btnGenerate').addEventListener('click',()=>{
  deckEmpty.hidden=true; deckLoading.hidden=false;
  setTimeout(()=>{deckLoading.hidden=true; queue=shuffle(NICHES[currentNiche].ideas.slice()); stack=[]; deck.innerHTML=''; initStack(); updateHUD();},900);
});
document.addEventListener('keydown',e=>{
  if(modal.classList.contains('open')) return;
  if(e.target.matches('input,textarea')) return;
  const r=$('#heroDemo').getBoundingClientRect();
  if(r.bottom<0||r.top>window.innerHeight) return;
  if(e.key==='ArrowRight') fling(1);
  if(e.key==='ArrowLeft') fling(-1);
});

/* ============ EXAMPLES ============ */
const SAMPLE_META=[{type:"carrossel · 8 artes",day:"seg · 08h"},{type:"post único",day:"qua · 12h"},{type:"ideia de reel",day:"sex · 18h"}];
const SLIDE_COLORS=["var(--blue)","var(--yellow)","var(--coral)","var(--green)"];
const exSamples=$('#exSamples'), cprev=$('#cprev'), cdots=$('#cdots'), capText=$('#capText'), exNicheName=$('#exNicheName');
let cIndex=0, cHover=false;

function renderExamples(key){
  const n=NICHES[key];
  exNicheName.textContent=n.name;
  exSamples.innerHTML=n.samples.map((s,i)=>{
    const m=SAMPLE_META[i];
    return '<div class="sample"><div class="sample-top"><span class="sample-type">'+m.type+'</span><span class="sample-day">'+m.day+'</span></div><p>'+s.text+'</p><div class="sample-foot"><span class="ok">✓ agendado</span><span class="react"><span>♥</span><span>💬</span><span>↗</span></span></div></div>';
  }).join('');
  cprev.innerHTML=n.carousel.map((t,i)=>{
    const isCta=i===n.carousel.length-1;
    return '<div class="cslide'+(i===0?' act':'')+'" style="background:'+SLIDE_COLORS[i%SLIDE_COLORS.length]+';color:var(--ink)"><span class="num">'+(i+1)+' / '+n.carousel.length+'</span>'+(isCta?'<span class="cta-line">'+t+'</span>':'<h4>'+t+'</h4>')+'</div>';
  }).join('');
  cdots.innerHTML=n.carousel.map((_,i)=>'<i class="cdot'+(i===0?' act':'')+'"></i>').join('');
  capText.textContent=n.samples[0].text;
  cIndex=0;
}
function cycleCarousel(){
  const slides=$$('#cprev .cslide'), dots=$$('#cdots .cdot');
  if(!slides.length) return;
  cIndex=(cIndex+1)%slides.length;
  slides.forEach((s,i)=>s.classList.toggle('act',i===cIndex));
  dots.forEach((d,i)=>d.classList.toggle('act',i===cIndex));
}
cprev.addEventListener('mouseenter',()=>cHover=true);
cprev.addEventListener('mouseleave',()=>cHover=false);
setInterval(()=>{if(!cHover) cycleCarousel();},2800);

function setNiche(key){
  if(key===currentNiche) return;
  currentNiche=key;
  $$('.nchip').forEach(b=>b.classList.toggle('active',b.dataset.niche===key));
  buildDeck(key);
  exSamples.classList.add('fading'); cprev.style.opacity='0';
  setTimeout(()=>{renderExamples(key);exSamples.classList.remove('fading');cprev.style.opacity='1';},260);
}
cprev.style.transition='opacity .3s';
buildDeck(currentNiche);
renderExamples(currentNiche);

/* ============ FAQ ============ */
$$('.faq-q').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const item=btn.parentElement, a=item.querySelector('.faq-a');
    const wasOpen=item.classList.contains('open');
    $$('.faq-item.open').forEach(o=>{o.classList.remove('open');o.querySelector('.faq-a').style.maxHeight=0;o.querySelector('.faq-q').setAttribute('aria-expanded','false');});
    if(!wasOpen){item.classList.add('open');a.style.maxHeight=a.scrollHeight+'px';btn.setAttribute('aria-expanded','true');}
  });
});

/* ============ MODAL ============ */
const modal=$('#signupModal'), formPane=$('#modalFormPane'), successPane=$('#modalSuccess');
const form=$('#signupForm'), submitBtn=$('#submitBtn');
const SUBMIT_HTML='Criar conta grátis <span class="arr">→</span>';
function openModal(){
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden'; mobileCta.classList.remove('show');
  setTimeout(()=>$('#fEmail').focus(),250);
}
function closeModal(){
  modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  setTimeout(()=>{
    formPane.hidden=false; successPane.hidden=true; form.reset();
    ['fEmail','fPass'].forEach(id=>$('#'+id).classList.remove('bad'));
    ['emailErr','passErr'].forEach(id=>$('#'+id).classList.remove('show'));
    submitBtn.classList.remove('loading'); submitBtn.innerHTML=SUBMIT_HTML;
    $$('.btn-social').forEach(b=>{b.classList.remove('loading');b.disabled=false;});
  },300);
}
$$('[data-open-modal]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openModal();}));
$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open')) closeModal();});
function showSuccess(){ formPane.hidden=true; successPane.hidden=false; }
form.addEventListener('submit',e=>{
  e.preventDefault();
  const email=$('#fEmail'), pass=$('#fPass');
  const okEmail=/.+@.+\..+/.test(email.value.trim()), okPass=pass.value.length>=8;
  email.classList.toggle('bad',!okEmail); $('#emailErr').classList.toggle('show',!okEmail);
  pass.classList.toggle('bad',!okPass); $('#passErr').classList.toggle('show',!okPass);
  if(!okEmail||!okPass) return;
  submitBtn.classList.add('loading'); submitBtn.innerHTML='<span class="spin"></span>&nbsp;&nbsp;Criando sua conta…';
  setTimeout(showSuccess,1100);
});
$$('.btn-social').forEach(b=>{
  b.addEventListener('click',()=>{b.classList.add('loading');b.disabled=true;setTimeout(showSuccess,800);});
});

/* smooth scroll */
$$('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const id=a.getAttribute('href');
    if(id.length>1 && !a.hasAttribute('data-open-modal')){
      const t=document.querySelector(id);
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
    }
  });
});
})();
