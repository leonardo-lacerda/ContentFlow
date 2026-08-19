'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import copy from 'copy-to-clipboard';
import {
  getMcpConfig,
  mcpClients,
  type McpClient,
  type McpSurface,
} from '@gitroom/frontend/components/public-api/public.component';

const authMethods = ['header', 'path'] as const;
type AuthMethod = (typeof authMethods)[number];

const authLabels: Record<AuthMethod, string> = {
  header: 'No terminal (Claude Code, Codex...)',
  path: 'No site/app da IA (ChatGPT, Claude web...)',
};

const surfaceCopy: Record<
  McpSurface,
  { tag: string; title: string; endpoint: string; points: string[] }
> = {
  studio: {
    tag: 'recomendado pra quase todo mundo',
    title: 'Estúdio — cria e agenda',
    endpoint: '/mcp-studio',
    points: [
      'Faz tudo que a opção "Agendamento" faz, e também:',
      'Cria ideias de post e carrosséis inteiros do zero',
      'Devolve o resultado organizado, pronto pra revisão',
      'Pensada pra IA usar sem precisar de cliques na tela',
    ],
  },
  scheduling: {
    tag: 'só agendamento',
    title: 'Agendamento',
    endpoint: '/mcp',
    points: [
      'Agenda posts prontos em qualquer rede conectada',
      'Confere se suas redes sociais estão conectadas certinho',
      'Também gera imagens e vídeos com IA',
      'Opção mais antiga — mantida pra quem já usa assim',
    ],
  },
};

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="mcpdocs-step">
      <span className="mcpdocs-step-n">{n}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-lime btn-sm"
      onClick={() => {
        try {
          copy(text);
        } catch {
          // Clipboard write can fail (permissions, insecure context, no
          // user-activation for the legacy prompt() fallback) — the click
          // still counts as an attempt, so still show the confirmation.
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? 'Copiado ✓' : 'Copiar'}
    </button>
  );
}

export function McpGuideClient() {
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [surface, setSurface] = useState<McpSurface>('studio');
  const [method, setMethod] = useState<AuthMethod>('header');
  const [client, setClient] = useState<McpClient>('Claude Code');

  const effectiveBase = (backendUrl.trim() || 'https://sua-instancia.com').replace(/\/$/, '');
  const effectiveKey = apiKey.trim() || 'SUA_API_KEY';

  const { config, hint } = getMcpConfig(client, method, effectiveBase, effectiveKey, surface) ?? {
    config: '',
    hint: '',
  };

  return (
    <div className="mcpdocs">
      <style>{`
        .mcpdocs{color:var(--ink)}
        .mcpdocs a{text-decoration:none}
        .mcpdocs-top{display:flex;align-items:center;justify-content:space-between;padding:26px 0}
        .mcpdocs-top .logo{cursor:pointer}
        .mcpdocs-top-links{display:flex;gap:10px;align-items:center}
        .mcpdocs-back{font:700 .82rem var(--body);color:var(--ink-soft)}
        .mcpdocs-back:hover{color:var(--ink)}

        .mcpdocs-hero{padding:20px 0 10px}
        .mcpdocs-hero h1{font:400 clamp(2rem,4.6vw,3.2rem)/1.08 var(--disp);letter-spacing:.4px;text-transform:uppercase;max-width:800px;margin-bottom:18px}
        .mcpdocs-hero p{font-size:1.08rem;color:var(--ink-soft);max-width:600px;line-height:1.6;margin-bottom:26px}
        .mcpdocs-hero-actions{display:flex;gap:14px;flex-wrap:wrap}

        .mcpdocs-steps{display:flex;flex-direction:column;gap:0}
        .mcpdocs-step{display:flex;gap:18px;padding:20px 0;border-bottom:1.5px dashed rgba(20,23,26,.18)}
        .mcpdocs-step:last-child{border-bottom:none}
        .mcpdocs-step-n{flex-shrink:0;width:38px;height:38px;border:var(--bd);border-radius:10px;background:var(--card);display:grid;place-items:center;font:400 1.1rem var(--disp);box-shadow:var(--hard-s)}
        .mcpdocs-step h3{font:800 1rem var(--body);margin-bottom:4px}
        .mcpdocs-step p{font-size:.92rem;color:var(--ink-soft);line-height:1.55}

        .mcpdocs-endpoints{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .mcpdocs-ep-card{border:var(--bd);border-radius:14px;background:var(--card);padding:22px;box-shadow:var(--hard-s);transition:transform .18s,box-shadow .18s}
        .mcpdocs-ep-card:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink)}
        .mcpdocs-ep-card.featured{background:var(--blue-t)}
        .mcpdocs-ep-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
        .mcpdocs-ep-head h3{font:800 1.05rem var(--body)}
        .mcpdocs-ep-endpoint{font:700 .78rem var(--mono);color:var(--ink-soft);background:var(--paper2);border:1.5px solid var(--ink);border-radius:6px;padding:2px 8px;display:inline-block;margin-bottom:14px}
        .mcpdocs-ep-card ul{list-style:none;display:flex;flex-direction:column;gap:6px}
        .mcpdocs-ep-card li{font-size:.86rem;color:var(--ink-soft);padding-left:16px;position:relative}
        .mcpdocs-ep-card li::before{content:"→";position:absolute;left:0;color:var(--ink-soft);font-size:.72rem;top:3px}
        .mcpdocs-note{margin-top:18px;border:1.5px dashed rgba(20,23,26,.3);border-radius:10px;padding:14px 18px;font-size:.88rem;color:var(--ink-soft)}
        .mcpdocs-note b{color:var(--ink)}

        .mcpdocs-inputs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}
        .mcpdocs-field label{display:block;font:700 .68rem var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:7px}
        .mcpdocs-field input{width:100%;border:var(--bd);border-radius:10px;background:var(--card);padding:11px 14px;font:700 .84rem var(--mono);color:var(--ink)}
        .mcpdocs-field input::placeholder{color:rgba(20,23,26,.35)}
        .mcpdocs-field input:focus{outline:3px solid var(--blue);outline-offset:1px}

        .mcpdocs-tabrow{margin-bottom:16px}
        .mcpdocs-tabrow-label{font:700 .7rem var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:9px;display:block}

        .mcpdocs-window{border:var(--bd);border-radius:14px;background:var(--card);box-shadow:8px 8px 0 var(--ink);overflow:hidden}
        .mcpdocs-window-head{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:var(--bd);background:var(--paper2)}
        .mcpdocs-window-title{font:700 .72rem var(--mono);color:var(--ink-soft);flex:1}
        .mcpdocs-window-body{padding:18px 20px;overflow-x:auto}
        .mcpdocs-window-body pre{font:700 .82rem/1.6 var(--mono);white-space:pre;color:var(--ink)}
        .mcpdocs-window-hint{padding:0 20px 18px;font-size:.82rem;color:var(--ink-soft)}
        .mcpdocs-window-foot{display:flex;justify-content:flex-end;padding:0 20px 18px}

        .mcpdocs-envlist{display:flex;flex-direction:column;gap:8px;margin-top:18px}
        .mcpdocs-envrow{display:flex;align-items:center;gap:14px;border:1.5px solid var(--ink);border-radius:8px;padding:10px 14px;background:var(--card)}
        .mcpdocs-envrow code{font:700 .78rem var(--mono);flex:1}
        .mcpdocs-envrow span{font:700 .68rem var(--body);color:var(--ink-soft);white-space:nowrap}

        .mcpdocs-final{text-align:center;border:var(--bd);border-radius:16px;background:var(--ink);color:var(--paper);padding:44px 30px;box-shadow:var(--hard)}
        .mcpdocs-final h2{font:400 clamp(1.6rem,3.6vw,2.3rem)/1.1 var(--disp);letter-spacing:.4px;text-transform:uppercase;margin-bottom:10px}
        .mcpdocs-final p{color:rgba(245,243,235,.7);margin-bottom:22px}
        .mcpdocs-final-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}

        @media(max-width:760px){
          .mcpdocs-endpoints{grid-template-columns:1fr}
          .mcpdocs-inputs{grid-template-columns:1fr}
        }
      `}</style>

      <div className="container mcpdocs-top">
        <Link className="logo" href="/">
          <span className="logo-mark">C</span>
          <span className="logo-txt">Content<b>Flow</b></span>
        </Link>
        <div className="mcpdocs-top-links">
          <Link className="mcpdocs-back" href="/docs/integrations">
            ← Documentação
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/settings">
            Configurações
          </Link>
        </div>
      </div>

      <section className="container mcpdocs-hero">
        <span className="eyebrow">deixe uma IA usar sua conta</span>
        <h1>
          Sua IA passa a <span className="hl">operar o ContentFlow</span> sozinha.
        </h1>
        <p>
          MCP é um jeito padrão de conectar uma inteligência artificial — Claude,
          ChatGPT, Cursor e outras — direto à sua conta ContentFlow. Depois de
          conectada, você só precisa pedir em português: "agende esse post pra
          amanhã" ou "me dá 5 ideias de carrossel" — e a IA faz sozinha, sem você
          precisar abrir o site.
        </p>
        <div className="mcpdocs-hero-actions">
          <a href="#configurar" className="btn btn-lime btn-lg">
            Configurar agora <span className="arr">↓</span>
          </a>
          <Link href="/settings" className="btn btn-dash btn-lg">
            Pegar minha API Key
          </Link>
        </div>
      </section>

      <section className="container" style={{ marginTop: 8 }}>
        <div className="mcpdocs-note" style={{ maxWidth: 640 }}>
          <b>Não curte configuração técnica?</b> Você pode pedir pra sua IA
          (Claude, ChatGPT, Gemini) ler o link desta página e te ajudar a
          seguir os passos — é uma página de documentação normal, sem nada
          escondido. Sua IA provavelmente vai confirmar com você antes de
          mexer em qualquer configuração, principalmente por causa da API
          Key — isso é o comportamento certo dela, não um erro. Nunca cole
          sua API Key real numa conversa com outra ferramenta de IA além da
          que você está configurando; se isso acontecer, rotacione a chave em{' '}
          <b>Configurações → Acesso à API</b> depois.
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="sec-head">
            <p className="eyebrow">antes de começar</p>
            <h2>O que você precisa</h2>
          </div>
          <div className="mcpdocs-steps">
            <Step n={1} title="Uma conta ContentFlow">
              Qualquer plano, inclusive o gratuito, já libera essa conexão.
            </Step>
            <Step n={2} title="Sua API Key (uma senha só sua, gerada automaticamente)">
              Vá em <b>Configurações → Acesso</b> e copie a chave. É com ela que o
              ContentFlow reconhece que é você — como uma senha, mas feita pra
              programas usarem, não pra você digitar toda hora. Você vai colar
              ela no gerador de configuração logo abaixo.
            </Step>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper2)' }}>
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">passo 1</p>
            <h2>Escolha o que a IA pode fazer</h2>
            <p className="sec-sub">
              O ContentFlow tem dois "endereços" diferentes pra IA se conectar —
              pense neles como dois planos de acesso. Escolha um.
            </p>
          </div>
          <div className="mcpdocs-endpoints">
            {(['studio', 'scheduling'] as const).map((s) => {
              const c = surfaceCopy[s];
              return (
                <div
                  key={s}
                  className={`mcpdocs-ep-card${s === 'studio' ? ' featured' : ''}`}
                >
                  <div className="mcpdocs-ep-head">
                    <h3>{c.title}</h3>
                    <span className={`tag-pill${s === 'studio' ? ' lime' : ''}`}>
                      {c.tag}
                    </span>
                  </div>
                  <span className="mcpdocs-ep-endpoint">{c.endpoint}</span>
                  <ul>
                    {c.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mcpdocs-note">
            <b>Na dúvida, escolha "Estúdio".</b> Ele faz tudo que o "Agendamento"
            faz e mais um pouco — a única razão pra escolher "Agendamento" é se
            você já tinha uma integração antiga configurada e não quer mexer nela.
          </div>
        </div>
      </section>

      <section className="section" id="configurar">
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">passo 2</p>
            <h2>Gere o comando de conexão</h2>
            <p className="sec-sub">
              Preencha os dois campos abaixo com os seus dados e o texto pronto
              pra copiar aparece na caixinha, atualizado na hora. Não precisa
              entender o que ele significa — só copiar e colar onde sua IA pedir.
            </p>
            <p className="sec-sub" style={{ color: 'var(--danger, #b91c1c)' }}>
              ⚠️ Sua API Key é uma senha. O texto gerado abaixo a contém em
              texto puro — cole ele só na configuração da sua própria IA
              (Claude Desktop, Cursor etc.), nunca dentro de uma conversa de
              chat com outra IA.
            </p>
          </div>

          <div className="mcpdocs-inputs">
            <div className="mcpdocs-field">
              <label htmlFor="mcpdocs-url">Endereço do seu ContentFlow</label>
              <input
                id="mcpdocs-url"
                type="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://sua-instancia.com"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
              />
            </div>
            <div className="mcpdocs-field">
              <label htmlFor="mcpdocs-key">Sua API Key</label>
              <input
                id="mcpdocs-key"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="cf_••••••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          <div className="mcpdocs-tabrow">
            <span className="mcpdocs-tabrow-label">O que a IA vai poder fazer</span>
            <div className="niche-row">
              {(['studio', 'scheduling'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`nchip${surface === s ? ' active' : ''}`}
                  onClick={() => setSurface(s)}
                >
                  {surfaceCopy[s].title} ({surfaceCopy[s].endpoint})
                </button>
              ))}
            </div>
          </div>

          <div className="mcpdocs-tabrow">
            <span className="mcpdocs-tabrow-label">Onde você vai colar isso</span>
            <div className="niche-row">
              {authMethods.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`nchip${method === m ? ' active' : ''}`}
                  onClick={() => setMethod(m)}
                >
                  {authLabels[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="mcpdocs-tabrow">
            <span className="mcpdocs-tabrow-label">Qual IA você usa</span>
            <div className="niche-row">
              {mcpClients.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`nchip${client === c ? ' active' : ''}`}
                  onClick={() => setClient(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mcpdocs-window">
            <div className="mcpdocs-window-head">
              <span className="win-dots">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className="mcpdocs-window-title">{client.toLowerCase()}</span>
            </div>
            <div className="mcpdocs-window-body">
              <pre>{config}</pre>
            </div>
            <div className="mcpdocs-window-hint">{hint}</div>
            <div className="mcpdocs-window-foot">
              <CopyBtn text={config} />
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper2)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="sec-head">
            <p className="eyebrow">passo 3</p>
            <h2>Confira se deu certo</h2>
          </div>
          <div className="mcpdocs-steps">
            <Step n={1} title="Cole o comando e reinicie a IA">
              Se copiou um comando de terminal, rode ele. Se copiou um JSON, cole
              no lugar que a IA indicou. Depois feche e abra a conversa de novo,
              se ela pedir.
            </Step>
            <Step n={2} title='Peça: "Liste meus canais do ContentFlow"'>
              A IA vai buscar suas redes sociais conectadas automaticamente. Se
              elas aparecerem na resposta, a conexão funcionou.
            </Step>
            <Step n={3} title="Peça uma ideia de conteúdo (se escolheu o Estúdio)">
              Experimente <i>"Me dê 5 ideias de conteúdo para minha marca."</i> A
              IA devolve ideias prontas: título, gancho, ângulo, rede social e
              chamada pra ação — como se um redator tivesse escrito pra você.
            </Step>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="sec-head">
            <p className="eyebrow">avançado · só pra quem desenvolve o ContentFlow</p>
            <h2>Rodando localmente</h2>
            <p className="sec-sub">
              Isso aqui não é pra usuários — é só se você (ou sua IA) estiver
              rodando o próprio código do ContentFlow no computador, fora de
              produção. Nesse caso, essas conexões ficam desligadas até você
              ativar no arquivo <code>.env</code> do backend:
            </p>
          </div>
          <div className="mcpdocs-envlist">
            <div className="mcpdocs-envrow">
              <code>ENABLE_MCP_LOCAL=true</code>
              <span>ativa /mcp</span>
            </div>
            <div className="mcpdocs-envrow">
              <code>ENABLE_STUDIO_MCP_LOCAL=true</code>
              <span>ativa /mcp-studio</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="mcpdocs-final">
            <h2>Pronto pra conectar?</h2>
            <p>Pegue sua API Key nas configurações e volte aqui pra gerar o comando.</p>
            <div className="mcpdocs-final-actions">
              <Link href="/settings" className="btn btn-lime btn-lg">
                Ir para Configurações
              </Link>
              <Link href="/" className="btn btn-inv btn-lg">
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
