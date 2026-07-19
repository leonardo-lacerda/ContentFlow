/* Shared SPA-ish runtime for design concepts. Expects CF_DATA + CF_CONFIG */
(function () {
  const D = () => window.CF_DATA;
  const C = () => window.CF_CONFIG || {};

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusDot(key) {
    return `<span class="dot ${esc(key || 'neutral')}"></span>`;
  }

  function pill(text, key) {
    return `<span class="pill pill-${esc(key || 'n')}">${esc(text)}</span>`;
  }

  const Views = {
    list() {
      const rows = D().creatives
        .map(
          (c) => `
        <tr data-open="detail" data-id="${esc(c.id)}">
          <td class="mono muted">${esc(c.id)}</td>
          <td><button type="button" class="link" data-open="detail" data-id="${esc(c.id)}">${esc(c.title)}</button></td>
          <td class="muted">${esc(c.channel)}</td>
          <td>${pill(c.status, c.statusKey)}</td>
          <td class="mono muted">${c.chars ?? '—'}</td>
          <td class="mono muted">${esc(c.updated)}</td>
        </tr>`
        )
        .join('');
      return `
        <div class="page-head">
          <div>
            <h1>Criativos</h1>
            <p class="sub">Posts, scripts, ads e e-mails · ${esc(D().workspace.name)}</p>
          </div>
          <div class="page-actions">
            <button type="button" class="btn btn-s" data-open="empty">Empty</button>
            <button type="button" class="btn btn-p" data-modal="create">Novo</button>
          </div>
        </div>
        <div class="tabs" role="tablist">
          <button type="button" class="tab on">Posts <span class="n">8</span></button>
          <button type="button" class="tab">Scripts <span class="n">2</span></button>
          <button type="button" class="tab">Ads <span class="n">1</span></button>
          <button type="button" class="tab">Email <span class="n">1</span></button>
        </div>
        <div class="toolbar">
          <input class="search" placeholder="Filtrar por título ou ID…" />
          <select class="select"><option>Todos os status</option><option>Pronto</option><option>Rascunho</option><option>Agendado</option></select>
          <select class="select"><option>Todos os canais</option><option>Instagram</option><option>LinkedIn</option><option>TikTok</option></select>
          <span class="toolbar-meta">${D().creatives.length} itens</span>
        </div>
        <div class="panel">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th><th>Título</th><th>Canal</th><th>Status</th><th>Chars</th><th>Atualizado</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    },

    empty() {
      return `
        <div class="page-head">
          <div><h1>Criativos</h1><p class="sub">Nenhum item neste filtro.</p></div>
          <div class="page-actions">
            <button type="button" class="btn btn-s" data-open="list">Voltar à lista</button>
            <button type="button" class="btn btn-p" data-modal="create">Criar criativo</button>
          </div>
        </div>
        <div class="panel empty-panel">
          <strong>Nada por aqui</strong>
          <p>Gere o primeiro post, script ou ad a partir da marca selecionada. Ele aparece na lista com ID e status.</p>
          <button type="button" class="btn btn-p" data-modal="create">Criar criativo</button>
        </div>`;
    },

    detail(id) {
      const c = D().creatives.find((x) => x.id === id) || D().creatives[0];
      return `
        <div class="page-head compact">
          <button type="button" class="btn btn-s" data-open="list">← Lista</button>
          <div class="page-actions">
            <button type="button" class="btn btn-s">Copiar</button>
            <button type="button" class="btn btn-s">Duplicar</button>
            <button type="button" class="btn btn-p">Agendar</button>
          </div>
        </div>
        <div class="split">
          <div class="panel pad">
            <div class="meta-row">${pill(c.channel, 'n')} ${pill(c.status, c.statusKey)} <span class="mono muted">${esc(c.id)}</span></div>
            <h1 class="detail-title">${esc(c.title)}</h1>
            <pre class="body-text">${esc(c.body)}</pre>
            <div class="tags">${(c.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
            <p class="cta-line"><b>CTA:</b> ${esc(c.cta || '—')}</p>
            <div class="log">
              <div class="log-h">Atividade</div>
              <div class="log-i"><time>14:22</time><span>Gerado · Social Posts</span></div>
              <div class="log-i"><time>14:25</time><span>${esc(D().workspace.user)} marcou como ${esc(c.status)}</span></div>
              <div class="log-i"><time>14:26</time><span>Hashtags revisadas</span></div>
            </div>
          </div>
          <aside class="panel pad props">
            <div class="prop"><label>Status</label><select><option>${esc(c.status)}</option><option>Rascunho</option><option>Agendado</option></select></div>
            <div class="prop"><label>Tom</label><div>${esc(c.tone)}</div></div>
            <div class="prop"><label>Marca</label><div>${esc(D().workspace.name)}</div></div>
            <div class="prop"><label>Chars</label><div class="mono">${c.chars ?? '—'}</div></div>
            <div class="prop"><label>Score</label><div class="mono">${c.score ?? '—'}</div></div>
            <div class="prop"><label>Atualizado</label><div>${esc(c.updated)}</div></div>
            <div class="prop"><label>Campanha</label><input value="Lançamento Q1" /></div>
          </aside>
        </div>`;
    },

    analytics() {
      const a = D().analytics;
      const kpis = a.kpis
        .map(
          (k) =>
            `<div class="kpi"><div class="l">${esc(k.l)}</div><div class="v">${esc(k.v)}</div><div class="d${k.up ? ' up' : ''}">${esc(k.d)}</div></div>`
        )
        .join('');
      const bars = a.channels
        .map(
          (c) =>
            `<div class="bar-row"><span class="nm">${esc(c.name)}</span><div class="track"><div class="fill" style="width:${c.pc}%"></div></div><span class="pc">${c.pc}%</span></div>`
        )
        .join('');
      const top = a.top
        .map(
          (t) =>
            `<tr><td>${esc(t.title)}</td><td class="muted">${esc(t.channel)}</td><td class="mono">${t.score}</td><td class="mono">${esc(t.eng)}</td><td class="mono">${t.saves}</td></tr>`
        )
        .join('');
      return `
        <div class="page-head"><div><h1>Analytics</h1><p class="sub">Últimos 7 dias · ${esc(D().workspace.name)}</p></div></div>
        <div class="kpi-grid">${kpis}</div>
        <div class="split">
          <div class="panel pad"><div class="panel-title">Por canal</div>${bars}</div>
          <div class="panel pad">
            <div class="panel-title">Leitura</div>
            <p class="muted" style="font-size:13px;line-height:1.55">Carrosséis educativos lideram saves. Ads em revisão ainda não entram no score médio da semana.</p>
          </div>
        </div>
        <div class="panel" style="margin-top:12px">
          <div class="panel-h"><span class="panel-title">Top peças</span></div>
          <table class="table"><thead><tr><th>Peça</th><th>Canal</th><th>Score</th><th>Eng.</th><th>Saves</th></tr></thead><tbody>${top}</tbody></table>
        </div>`;
    },

    calendar() {
      const cal = D().calendar;
      const ch = cal.channels
        .map(
          (c) =>
            `<div class="ch"><span class="ch-dot" style="background:${esc(c.color)}"></span>${esc(c.name)} · ${esc(c.platform)}</div>`
        )
        .join('');
      const days = cal.days
        .map((d) => {
          const ev = d.events
            .map((e) => `<div class="event k-${esc(e.k)}">${esc(e.t)}</div>`)
            .join('');
          return `<div class="day"><div class="day-n">${esc(d.name)}</div>${ev || ''}</div>`;
        })
        .join('');
      return `
        <div class="page-head">
          <div><h1>Calendário</h1><p class="sub">${esc(cal.label)}</p></div>
          <div class="page-actions">
            <button type="button" class="btn btn-s">Hoje</button>
            <button type="button" class="btn btn-p">Novo post</button>
          </div>
        </div>
        <div class="cal-wrap panel">
          <aside class="cal-side">
            <div class="panel-title">Canais</div>
            ${ch}
            <button type="button" class="btn btn-s block">Conectar canal</button>
          </aside>
          <div class="cal-main"><div class="week">${days}</div></div>
        </div>`;
    },

    brands() {
      const rows = D()
        .brands.map(
          (b) => `
        <tr>
          <td><button type="button" class="link" data-open="brand" data-id="${esc(b.id)}">${esc(b.name)}</button></td>
          <td class="muted mono">${esc(b.site)}</td>
          <td class="muted">${esc(b.industry)}</td>
          <td>${pill(b.status, b.dna ? 'ok' : 'warn')}</td>
          <td><button type="button" class="btn btn-s btn-xs" data-open="brand" data-id="${esc(b.id)}">DNA</button></td>
        </tr>`
        )
        .join('');
      return `
        <div class="page-head">
          <div><h1>Marcas</h1><p class="sub">Perfis e Brand DNA</p></div>
          <div class="page-actions"><button type="button" class="btn btn-p">Nova marca</button></div>
        </div>
        <div class="panel">
          <table class="table">
            <thead><tr><th>Nome</th><th>Site</th><th>Indústria</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    },

    brand() {
      const d = D().dna;
      return `
        <div class="page-head compact">
          <button type="button" class="btn btn-s" data-open="brands">← Marcas</button>
          <div class="page-actions">
            <button type="button" class="btn btn-s">Analisar site</button>
            <button type="button" class="btn btn-p">Salvar snapshot</button>
          </div>
        </div>
        <h1 class="detail-title" style="margin:8px 0 14px">Acme SaaS · Brand DNA</h1>
        <div class="dna-grid">
          <div class="panel pad"><div class="panel-title">Resumo</div>
            <p><b>Tagline:</b> ${esc(d.summary.tagline)}</p>
            <p><b>Indústria:</b> ${esc(d.summary.industry)}</p>
            <p><b>Público:</b> ${esc(d.summary.audience)}</p>
          </div>
          <div class="panel pad"><div class="panel-title">Voz</div>
            <p><b>Tom:</b> ${esc(d.voice.tone)}</p>
            <p><b>Estilo:</b> ${esc(d.voice.style)}</p>
            <p><b>Evitar:</b> ${esc(d.voice.avoid)}</p>
          </div>
          <div class="panel pad"><div class="panel-title">Público</div>
            <p><b>Dores:</b> ${esc(d.audience.pains.join('; '))}</p>
            <p><b>Desejos:</b> ${esc(d.audience.desires.join('; '))}</p>
            <p><b>Objeções:</b> ${esc(d.audience.objections.join('; '))}</p>
          </div>
          <div class="panel pad"><div class="panel-title">Oferta</div>
            <p>${esc(d.offer.products.join(', '))}</p>
            <p><b>Preço:</b> ${esc(d.offer.price)}</p>
            <p><b>Diferenciais:</b> ${esc(d.offer.diffs.join(', '))}</p>
          </div>
          <div class="panel pad"><div class="panel-title">Visual</div>
            <p><b>Cores:</b> ${esc(d.visual.colors)}</p>
            <p><b>Estilo:</b> ${esc(d.visual.style)}</p>
            <p><b>Tipo:</b> ${esc(d.visual.type)}</p>
          </div>
          <div class="panel pad"><div class="panel-title">Restrições</div>
            <ul class="plain">${d.constraints.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>`;
    },

    swipe() {
      const i = D().ideas[0];
      return `
        <div class="page-head"><div><h1>Content Swipe</h1><p class="sub">Revisão de ideias · Brand DNA</p></div></div>
        <div class="swipe-stage">
          <div class="swipe-card panel pad">
            <div class="muted" style="font-size:12px;margin-bottom:8px">Ideia ${i.n} de ${i.total} · score ${i.score}</div>
            <div class="tags"><span class="tag">${esc(i.platform)}</span><span class="tag">educar</span></div>
            <h2 class="detail-title" style="font-size:20px;margin:10px 0">${esc(i.title)}</h2>
            <p class="body-p"><b>Hook:</b> ${esc(i.hook)}</p>
            <p class="body-p"><b>Ângulo:</b> ${esc(i.angle)}</p>
            <p class="body-p"><b>Objetivo:</b> ${esc(i.goal)}</p>
            <div class="swipe-actions">
              <button type="button" class="btn btn-s">Descartar</button>
              <button type="button" class="btn btn-s">Salvar</button>
              <button type="button" class="btn btn-p">Aprovar</button>
              <button type="button" class="btn btn-p">Criar carrossel</button>
            </div>
          </div>
        </div>`;
    },

    studio() {
      const slides = [1, 2, 3, 4, 5, 6]
        .map((n) => `<div class="slide"><b>${n}</b><span>${n === 1 ? 'Capa' : n === 6 ? 'CTA' : 'Bloco'}</span></div>`)
        .join('');
      return `
        <div class="page-head"><div><h1>AI Images</h1><p class="sub">Studio de carrosséis</p></div>
          <div class="page-actions">
            <button type="button" class="btn btn-s">Salvar projeto</button>
            <button type="button" class="btn btn-p">Gerar imagens</button>
          </div>
        </div>
        <div class="studio">
          <div class="panel pad studio-form">
            <div class="field"><label>Tópico</label><input value="Checklist de posicionamento B2B" /></div>
            <div class="field"><label>Template</label><select><option>Educativo 6 slides</option><option>Antes/depois</option><option>Oferta</option></select></div>
            <div class="field"><label>Plataforma</label><select><option>Instagram 1080×1350</option><option>LinkedIn</option><option>1:1</option></select></div>
            <div class="field"><label>Tom</label><input value="claro, prático, sem hype" /></div>
            <div class="field"><label>Slides</label><input type="number" value="6" min="3" max="12" /></div>
            <div class="field"><label>Brief</label><textarea>Usar Brand DNA Acme. CTA: salvar o post.</textarea></div>
            <div class="muted" style="font-size:11px">Estimativa R$ 1,80 · 6 imagens</div>
            <button type="button" class="btn btn-p block">Gerar plano</button>
          </div>
          <div class="panel pad">
            <div class="panel-title">Preview</div>
            <div class="slides">${slides}</div>
          </div>
        </div>`;
    },

    jobs() {
      const rows = D()
        .jobs.map(
          (j) => `
        <tr>
          <td class="mono muted">${esc(j.id)}</td>
          <td>${esc(j.title)}</td>
          <td class="muted">${esc(j.type)}</td>
          <td><span class="status">${statusDot(j.statusKey)}${esc(j.status)}</span></td>
          <td class="mono muted">${esc(j.at)}</td>
          <td class="mono muted">${esc(j.cost)}</td>
        </tr>`
        )
        .join('');
      return `
        <div class="page-head"><div><h1>Jobs</h1><p class="sub">Fila de geração e exportação</p></div>
          <div class="page-actions"><button type="button" class="btn btn-s">Atualizar</button></div>
        </div>
        <div class="panel">
          <table class="table">
            <thead><tr><th>ID</th><th>Job</th><th>Tipo</th><th>Status</th><th>Início</th><th>Custo</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    },

    media() {
      const tiles = Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        return `<div class="media-item"><div class="media-th">PNG</div><div class="media-cap">slide-${n}.png · 1080</div></div>`;
      }).join('');
      return `
        <div class="page-head"><div><h1>Media</h1><p class="sub">24 arquivos na biblioteca</p></div>
          <div class="page-actions"><button type="button" class="btn btn-p">Upload</button></div>
        </div>
        <div class="media-grid">${tiles}</div>`;
    },

    editorial() {
      const rows = D()
        .editorial.map(
          (e) =>
            `<tr><td>${esc(e.name)}</td><td class="muted">${esc(e.freq)}</td><td>${pill(e.status, e.statusKey)}</td><td><button type="button" class="btn btn-s btn-xs">Abrir</button></td></tr>`
        )
        .join('');
      return `
        <div class="page-head"><div><h1>Editorial</h1><p class="sub">Planos da marca selecionada</p></div>
          <div class="page-actions"><button type="button" class="btn btn-p">Novo plano</button></div>
        </div>
        <div class="panel"><table class="table"><thead><tr><th>Plano</th><th>Frequência</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    },

    settings() {
      return `
        <div class="page-head"><div><h1>Settings</h1><p class="sub">Conta e preferências</p></div></div>
        <div class="split">
          <div class="panel pad">
            <div class="panel-title">Perfil</div>
            <div class="field"><label>Nome</label><input value="${esc(D().workspace.user)}" /></div>
            <div class="field"><label>E-mail</label><input value="${esc(D().workspace.email)}" /></div>
            <div class="field"><label>Timezone</label><select><option>America/Sao_Paulo</option><option>UTC</option></select></div>
            <button type="button" class="btn btn-p">Salvar</button>
          </div>
          <div class="panel pad">
            <div class="panel-title">Notificações</div>
            <div class="toggle"><span>Job concluído</span><button type="button" class="sw on" aria-label="on"></button></div>
            <div class="toggle"><span>Falha de geração</span><button type="button" class="sw on" aria-label="on"></button></div>
            <div class="toggle"><span>Resumo semanal</span><button type="button" class="sw" aria-label="off"></button></div>
            <div class="panel-title" style="margin-top:16px">API</div>
            <div class="field"><label>Chave</label><input class="mono" readonly value="cf_live_••••••••••••9f2a" /></div>
          </div>
        </div>`;
    },

    affiliates() {
      return `
        <div class="page-head"><div><h1>Afiliados</h1><p class="sub">Programa de indicação</p></div></div>
        <div class="kpi-grid">
          <div class="kpi"><div class="l">Cliques</div><div class="v">1.284</div><div class="d">30d</div></div>
          <div class="kpi"><div class="l">Conversões</div><div class="v">37</div><div class="d">2,9%</div></div>
          <div class="kpi"><div class="l">Pendentes</div><div class="v">R$ 420</div><div class="d">—</div></div>
          <div class="kpi"><div class="l">Pagos</div><div class="v">R$ 1.890</div><div class="d">YTD</div></div>
        </div>
        <div class="panel pad">
          <div class="panel-title">Seu link</div>
          <div class="inline-copy"><input readonly value="https://contentflow.com/ref/acme-leo" /><button type="button" class="btn btn-s">Copiar</button></div>
        </div>`;
    },

    templates() {
      const cards = D()
        .templates.map(
          (t) =>
            `<div class="card-tile panel pad"><div class="muted" style="font-size:11px">${esc(t.cat)}</div><div style="font-weight:600;margin:6px 0">${esc(t.name)}</div><div class="muted" style="font-size:12px">${t.installs} instalações</div><button type="button" class="btn btn-s btn-xs" style="margin-top:10px">Instalar</button></div>`
        )
        .join('');
      return `
        <div class="page-head"><div><h1>Templates</h1><p class="sub">Marketplace interno</p></div></div>
        <div class="tile-grid">${cards}</div>`;
    },

    integrations() {
      const rows = D()
        .integrations.map(
          (i) =>
            `<tr><td>${esc(i.name)}</td><td>${pill(i.status, i.status === 'Conectado' ? 'ok' : i.status === 'Pendente' ? 'warn' : 'n')}</td><td><button type="button" class="btn btn-s btn-xs">${i.status === 'Conectado' ? 'Gerenciar' : 'Conectar'}</button></td></tr>`
        )
        .join('');
      return `
        <div class="page-head"><div><h1>Integrações</h1><p class="sub">Canais e ferramentas</p></div></div>
        <div class="panel"><table class="table"><thead><tr><th>Serviço</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    },

    billing() {
      return `
        <div class="page-head"><div><h1>Billing</h1><p class="sub">Plano e uso</p></div></div>
        <div class="split">
          <div class="panel pad">
            <div class="panel-title">Plano atual</div>
            <div style="font-size:22px;font-weight:600;letter-spacing:-.02em;margin:8px 0">Pro</div>
            <p class="muted">R$ 197/mês · renovação em 9 abr 2026</p>
            <div style="margin-top:14px;display:flex;gap:8px">
              <button type="button" class="btn btn-p">Alterar plano</button>
              <button type="button" class="btn btn-s">Portal de cobrança</button>
            </div>
          </div>
          <div class="panel pad">
            <div class="panel-title">Uso no ciclo</div>
            <div class="bar-row"><span class="nm">Geracões</span><div class="track"><div class="fill" style="width:62%"></div></div><span class="pc">62%</span></div>
            <div class="bar-row"><span class="nm">Imagens</span><div class="track"><div class="fill" style="width:41%"></div></div><span class="pc">41%</span></div>
            <div class="bar-row"><span class="nm">Assentos</span><div class="track"><div class="fill" style="width:25%"></div></div><span class="pc">1/4</span></div>
          </div>
        </div>`;
    },

    onboarding() {
      const steps = [
        ['ok', 'Criar marca', 'Acme SaaS'],
        ['ok', 'Analisar site', 'DNA gerado'],
        ['blue', 'Revisar DNA', 'Em andamento'],
        ['n', 'Gerar ideias', 'Pendente'],
        ['n', 'Primeiro carrossel', 'Pendente'],
      ];
      return `
        <div class="page-head"><div><h1>Onboarding</h1><p class="sub">Configure a marca e publique o primeiro carrossel</p></div></div>
        <div class="panel pad">
          ${steps
            .map(
              ([k, t, s], i) =>
                `<div class="onb-step"><span class="status">${statusDot(k)}</span><div><b>${i + 1}. ${esc(t)}</b><div class="muted" style="font-size:12px">${esc(s)}</div></div></div>`
            )
            .join('')}
          <button type="button" class="btn btn-p" style="margin-top:12px">Continuar</button>
        </div>`;
    },

    // Board-specific kanban
    board() {
      const cols = [
        ['Rascunho', D().creatives.filter((c) => c.statusKey === 'warn' || c.status === 'Rascunho')],
        ['Em revisão', D().creatives.filter((c) => c.statusKey === 'neutral')],
        ['Pronto', D().creatives.filter((c) => c.statusKey === 'ok')],
        ['Agendado', D().creatives.filter((c) => c.statusKey === 'blue')],
      ];
      return `
        <div class="page-head"><div><h1>Quadro</h1><p class="sub">Fluxo de produção por status</p></div>
          <div class="page-actions"><button type="button" class="btn btn-p" data-modal="create">Novo card</button></div>
        </div>
        <div class="kanban">
          ${cols
            .map(
              ([name, items]) => `
            <div class="kan-col">
              <div class="kan-h">${esc(name)} <span class="n">${items.length}</span></div>
              ${items
                .map(
                  (c) =>
                    `<button type="button" class="kan-card" data-open="detail" data-id="${esc(c.id)}"><div class="muted mono" style="font-size:11px">${esc(c.id)}</div><div style="font-weight:550;margin-top:4px">${esc(c.title)}</div><div class="muted" style="font-size:12px;margin-top:6px">${esc(c.channel)}</div></button>`
                )
                .join('')}
            </div>`
            )
            .join('')}
        </div>`;
    },

    // Spreadsheet grid
    grid() {
      const head = ['ID', 'Título', 'Canal', 'Status', 'Tom', 'Score', 'Atualizado'];
      const rows = D()
        .creatives.map(
          (c) =>
            `<tr><td class="mono">${esc(c.id)}</td><td contenteditable="true">${esc(c.title)}</td><td>${esc(c.channel)}</td><td>${esc(c.status)}</td><td>${esc(c.tone)}</td><td class="mono">${c.score}</td><td class="mono muted">${esc(c.updated)}</td></tr>`
        )
        .join('');
      return `
        <div class="page-head"><div><h1>Planilha</h1><p class="sub">Edição tabular dos criativos</p></div>
          <div class="page-actions"><button type="button" class="btn btn-s">Export CSV</button><button type="button" class="btn btn-p" data-modal="create">Linha nova</button></div>
        </div>
        <div class="panel sheet-wrap">
          <table class="table sheet">
            <thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    },

    // Thread / conversation style about a creative
    thread() {
      const c = D().creatives[0];
      return `
        <div class="page-head compact">
          <button type="button" class="btn btn-s" data-open="list">← Fila</button>
          <div class="page-actions"><button type="button" class="btn btn-p">Aprovar peça</button></div>
        </div>
        <div class="split">
          <div class="panel pad">
            <div class="muted mono" style="font-size:12px">${esc(c.id)} · ${esc(c.channel)}</div>
            <h1 class="detail-title">${esc(c.title)}</h1>
            <pre class="body-text">${esc(c.body)}</pre>
          </div>
          <div class="panel pad thread">
            <div class="panel-title">Discussão interna</div>
            <div class="msg"><b>Ana</b><span class="muted"> · 13:40</span><p>Hook forte. Eu encurtaria o parágrafo 2.</p></div>
            <div class="msg"><b>Leo</b><span class="muted"> · 13:55</span><p>Ajustei. Podem aprovar?</p></div>
            <div class="msg"><b>Bruno</b><span class="muted"> · 14:02</span><p>CTA ok. Manda pro calendário de quarta.</p></div>
            <div class="composer"><textarea placeholder="Comentar…"></textarea><button type="button" class="btn btn-p">Enviar</button></div>
          </div>
        </div>`;
    },

    // Shelf / library of assets
    shelf() {
      const items = [
        ...D().creatives.slice(0, 6).map((c) => ({ k: 'Peça', t: c.title, m: c.channel })),
        ...D().templates.map((t) => ({ k: 'Template', t: t.name, m: t.cat })),
      ];
      return `
        <div class="page-head"><div><h1>Estante</h1><p class="sub">Biblioteca unificada de peças e templates</p></div>
          <div class="page-actions"><input class="search" placeholder="Buscar na estante…" /></div>
        </div>
        <div class="tile-grid">
          ${items
            .map(
              (i) =>
                `<div class="card-tile panel pad"><div class="muted" style="font-size:11px">${esc(i.k)}</div><div style="font-weight:600;margin-top:6px">${esc(i.t)}</div><div class="muted" style="font-size:12px;margin-top:4px">${esc(i.m)}</div></div>`
            )
            .join('')}
        </div>`;
    },

    // Signal / command center
    signal() {
      return `
        <div class="page-head"><div><h1>Central</h1><p class="sub">O que precisa de atenção agora</p></div></div>
        <div class="kpi-grid">
          <div class="kpi"><div class="l">Aprovar</div><div class="v">5</div><div class="d">ideias no Swipe</div></div>
          <div class="kpi"><div class="l">Jobs ativos</div><div class="v">2</div><div class="d">1 falhou</div></div>
          <div class="kpi"><div class="l">Agendados 7d</div><div class="v">6</div><div class="d">2 sem canal</div></div>
          <div class="kpi"><div class="l">Score semanal</div><div class="v">72</div><div class="d up">+3</div></div>
        </div>
        <div class="split">
          <div class="panel pad">
            <div class="panel-title">Fila de atenção</div>
            <button type="button" class="attn" data-open="swipe"><b>5 ideias</b> esperando swipe</button>
            <button type="button" class="attn" data-open="jobs"><b>job_85</b> export falhou — reprocessar</button>
            <button type="button" class="attn" data-open="detail" data-id="CF-177"><b>CF-177</b> ad em rascunho há 5 dias</button>
            <button type="button" class="attn" data-open="brand"><b>Casa Verde</b> DNA incompleto</button>
          </div>
          <div class="panel pad">
            <div class="panel-title">Hoje no calendário</div>
            <div class="event k-blue" style="margin-bottom:6px">Carousel hooks · IG</div>
            <div class="event k-warn" style="margin-bottom:6px">Draft ads · Meta</div>
            <button type="button" class="btn btn-s" data-open="calendar" style="margin-top:10px">Abrir calendário</button>
          </div>
        </div>`;
    },
  };

  // Aliases used by nav configs
  Views.list = Views.list;
  Views.inbox = Views.list;
  Views.an = Views.analytics;
  Views.cal = Views.calendar;
  Views.create = Views.list;

  function modalHTML() {
    return `
      <div class="overlay" id="overlay" hidden>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-h"><span id="modal-title">Novo criativo</span><button type="button" class="icon-btn" data-close-modal>✕</button></div>
          <div class="modal-b">
            <div class="field"><label>Tipo</label><select><option>Post social</option><option>Video script</option><option>Ad</option><option>Email</option></select></div>
            <div class="field"><label>Tópico</label><input id="modal-topic" placeholder="Sobre o que gerar?" /></div>
            <div class="field"><label>Canal</label><select><option>Instagram</option><option>LinkedIn</option><option>TikTok</option></select></div>
            <div class="field"><label>Notas</label><textarea placeholder="CTA, restrições, tom…"></textarea></div>
          </div>
          <div class="modal-f">
            <button type="button" class="btn btn-s" data-close-modal>Cancelar</button>
            <button type="button" class="btn btn-p" data-close-modal data-open="list">Gerar</button>
          </div>
        </div>
      </div>`;
  }

  function renderNav(active) {
    const nav = C().nav || [];
    return nav
      .map((section) => {
        const items = section.items
          .map((it) => {
            const on = it.view === active ? ' on' : '';
            const cnt = it.cnt != null ? `<span class="cnt">${it.cnt}</span>` : '';
            return `<button type="button" class="nav-item${on}" data-open="${esc(it.view)}">${esc(it.label)}${cnt}</button>`;
          })
          .join('');
        return `<div class="nav-label">${esc(section.label)}</div>${items}`;
      })
      .join('');
  }

  let state = { view: C().home || 'list', id: null };

  function setView(view, id) {
    state = { view, id: id || null };
    const root = document.getElementById('view');
    const fn = Views[view] || Views.list;
    root.innerHTML = fn(id);
    document.getElementById('side-nav').innerHTML = renderNav(view === 'detail' || view === 'empty' ? 'list' : view === 'brand' ? 'brands' : view);
    document.getElementById('crumb').textContent = (C().crumbs && C().crumbs[view]) || view;
    // bind local
    root.querySelectorAll('[data-open]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        setView(b.getAttribute('data-open'), b.getAttribute('data-id'));
      })
    );
    root.querySelectorAll('[data-modal]').forEach((b) => b.addEventListener('click', openModal));
  }

  function openModal() {
    const o = document.getElementById('overlay');
    o.hidden = false;
    o.classList.add('open');
    setTimeout(() => document.getElementById('modal-topic')?.focus(), 30);
  }
  function closeModal() {
    const o = document.getElementById('overlay');
    o.hidden = true;
    o.classList.remove('open');
  }

  function boot() {
    const app = document.getElementById('app');
    const cfg = C();
    document.title = `${cfg.name || 'Concept'} — ContentFlow`;
    document.getElementById('side-nav').innerHTML = renderNav(state.view);
    document.getElementById('ws-name').textContent = D().workspace.name;
    document.getElementById('concept-tag').textContent = cfg.tag || cfg.name || '';
    const pn = document.getElementById('product-name');
    if (pn) pn.textContent = cfg.name ? `ContentFlow · ${cfg.name}` : 'ContentFlow';
    if (!document.getElementById('overlay')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML());
    }
    document.body.addEventListener('click', (e) => {
      const t = e.target.closest('[data-open]');
      if (t && !t.closest('#view')) {
        setView(t.getAttribute('data-open'), t.getAttribute('data-id'));
      }
      if (e.target.closest('[data-modal]')) openModal();
      if (e.target.closest('[data-close-modal]')) closeModal();
      if (e.target.id === 'overlay') closeModal();
      if (e.target.closest('.sw')) e.target.closest('.sw').classList.toggle('on');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && document.activeElement === document.body) openModal();
    });
    setView(state.view);
  }

  window.CF_BOOT = boot;
  window.CF_SET_VIEW = setView;
})();
