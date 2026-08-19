'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import copy from 'copy-to-clipboard';

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
          // Clipboard write can fail (permissions, insecure context) — the
          // click still counts as an attempt, so still show the confirmation.
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? 'Copiado ✓' : 'Copiar'}
    </button>
  );
}

function CodeWindow({
  title,
  code,
}: {
  title: string;
  code: string;
}) {
  return (
    <div className="idocs-window">
      <div className="idocs-window-head">
        <span className="win-dots">
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span className="idocs-window-title">{title}</span>
        <CopyBtn text={code} />
      </div>
      <div className="idocs-window-body">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="idocs-step">
      <span className="idocs-step-n">{n}</span>
      <div>
        <h3>{title}</h3>
        <div>{children}</div>
      </div>
    </div>
  );
}

const endpointGroups = [
  {
    title: 'Marcas',
    desc: 'O perfil da sua marca: tom de voz, público, o que ela pode e não pode dizer.',
    rows: [
      ['GET', '/public/v1/brands', 'Listar suas marcas'],
      ['POST', '/public/v1/brands', 'Criar uma marca nova'],
      ['GET', '/public/v1/brands/:id', 'Ver os detalhes de uma marca'],
      ['POST', '/public/v1/brands/:id/analyze', 'Ler um site e aprender o tom de voz dele automaticamente'],
      ['GET', '/public/v1/brands/:id/dna', 'Ver o que o sistema aprendeu sobre essa marca'],
    ],
  },
  {
    title: 'Ideias de conteúdo',
    desc: 'Sugestões de post prontas, geradas pela IA a partir do perfil da marca.',
    rows: [
      ['GET', '/public/v1/content-ideas', 'Listar ideias já geradas'],
      ['POST', '/public/v1/content-ideas/generate', 'Pedir novas ideias pra IA'],
    ],
  },
  {
    title: 'Carrosséis',
    desc: 'Os posts em formato de carrossel (várias imagens em sequência) que a IA monta.',
    rows: [
      ['GET', '/public/v1/carousel-projects', 'Listar carrosséis já criados'],
      ['POST', '/public/v1/carousel-projects/generate', 'Pedir um carrossel novo pra IA'],
      ['GET', '/public/v1/carousel-projects/:id', 'Ver como está um carrossel específico'],
    ],
  },
  {
    title: 'Acompanhamento de tarefas',
    desc: 'Gerar conteúdo com IA leva alguns segundos — use isso pra saber quando ficou pronto.',
    rows: [
      ['GET', '/public/v1/generation-jobs', 'Listar tarefas em andamento ou concluídas'],
      ['GET', '/public/v1/generation-jobs/:id', 'Ver se uma tarefa específica já terminou'],
    ],
  },
];

export function IntegrationsGuideClient() {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const effectiveBase = (baseUrl.trim() || 'https://sua-instancia.com').replace(/\/$/, '');
  const effectiveKey = apiKey.trim() || 'SUA_API_KEY';

  const firstRequestCode = `curl -X GET ${effectiveBase}/public/v1/brands \\\n  -H "Authorization: ${effectiveKey}"`;

  const generateCarouselCode = `curl -X POST ${effectiveBase}/public/v1/carousel-projects/generate \\\n  -H "Authorization: ${effectiveKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "brandProfileId": "id-da-sua-marca",\n    "topic": "5 dicas de produtividade",\n    "slideCount": 6,\n    "platform": "instagram"\n  }'`;

  const webhookConfigCode = `curl -X POST ${effectiveBase}/webhooks \\\n  -H "Authorization: ${effectiveKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "url": "https://seu-site.com/webhook",\n    "events": ["job.completed", "job.failed"]\n  }'`;

  const verifySignatureCode = `const crypto = require('crypto');\n\nfunction verifySignature(payload, signature, secret) {\n  const expected = 'sha256=' + crypto\n    .createHmac('sha256', secret)\n    .update(payload)\n    .digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(signature),\n    Buffer.from(expected)\n  );\n}`;

  return (
    <div className="idocs">
      <style>{`
        .idocs{color:var(--ink)}
        .idocs a{text-decoration:none}
        .idocs-top{display:flex;align-items:center;justify-content:space-between;padding:26px 0}
        .idocs-top-links{display:flex;gap:10px;align-items:center}
        .idocs-back{font:700 .82rem var(--body);color:var(--ink-soft)}
        .idocs-back:hover{color:var(--ink)}

        .idocs-hero{padding:20px 0 10px}
        .idocs-hero h1{font:400 clamp(2rem,4.6vw,3.2rem)/1.08 var(--disp);letter-spacing:.4px;text-transform:uppercase;max-width:820px;margin-bottom:18px}
        .idocs-hero p{font-size:1.08rem;color:var(--ink-soft);max-width:640px;line-height:1.6;margin-bottom:26px}
        .idocs-hero-actions{display:flex;gap:14px;flex-wrap:wrap}

        .idocs-note{border:1.5px dashed rgba(20,23,26,.3);border-radius:10px;padding:14px 18px;font-size:.92rem;color:var(--ink-soft);line-height:1.55}
        .idocs-note b{color:var(--ink)}

        .idocs-capgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .idocs-cap{border:var(--bd);border-radius:14px;background:var(--card);padding:20px;box-shadow:var(--hard-s)}
        .idocs-cap-emoji{font-size:1.5rem;margin-bottom:8px;display:block}
        .idocs-cap h3{font:800 1rem var(--body);margin-bottom:6px}
        .idocs-cap p{font-size:.86rem;color:var(--ink-soft);line-height:1.5}

        .idocs-steps{display:flex;flex-direction:column;gap:0}
        .idocs-step{display:flex;gap:18px;padding:22px 0;border-bottom:1.5px dashed rgba(20,23,26,.18)}
        .idocs-step:last-child{border-bottom:none}
        .idocs-step-n{flex-shrink:0;width:38px;height:38px;border:var(--bd);border-radius:10px;background:var(--card);display:grid;place-items:center;font:400 1.1rem var(--disp);box-shadow:var(--hard-s)}
        .idocs-step h3{font:800 1rem var(--body);margin-bottom:8px}
        .idocs-step p{font-size:.92rem;color:var(--ink-soft);line-height:1.55;margin-bottom:10px}

        .idocs-inputs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}
        .idocs-field label{display:block;font:700 .68rem var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:7px}
        .idocs-field input{width:100%;border:var(--bd);border-radius:10px;background:var(--card);padding:11px 14px;font:700 .84rem var(--mono);color:var(--ink)}
        .idocs-field input::placeholder{color:rgba(20,23,26,.35)}
        .idocs-field input:focus{outline:3px solid var(--blue);outline-offset:1px}

        .idocs-window{border:var(--bd);border-radius:14px;background:var(--card);box-shadow:6px 6px 0 var(--ink);overflow:hidden;margin-top:8px}
        .idocs-window-head{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:var(--bd);background:var(--paper2)}
        .idocs-window-title{font:700 .72rem var(--mono);color:var(--ink-soft);flex:1}
        .idocs-window-body{padding:16px 18px;overflow-x:auto}
        .idocs-window-body pre{font:700 .8rem/1.6 var(--mono);white-space:pre;color:var(--ink)}

        .idocs-group{margin-bottom:34px}
        .idocs-group:last-child{margin-bottom:0}
        .idocs-group-head{margin-bottom:12px}
        .idocs-group-head h3{font:800 1.05rem var(--body);margin-bottom:4px}
        .idocs-group-head p{font-size:.86rem;color:var(--ink-soft)}
        .idocs-table{width:100%;border-collapse:collapse;border:var(--bd);border-radius:10px;overflow:hidden;background:var(--card)}
        .idocs-table th{text-align:left;font:700 .68rem var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);background:var(--paper2);padding:10px 14px;border-bottom:var(--bd)}
        .idocs-table td{padding:10px 14px;border-bottom:1px solid rgba(20,23,26,.12);font-size:.86rem}
        .idocs-table tr:last-child td{border-bottom:none}
        .idocs-table code{font:700 .78rem var(--mono);background:var(--paper2);padding:2px 6px;border-radius:4px}
        .idocs-method{display:inline-block;font:800 .68rem var(--mono);padding:2px 8px;border-radius:5px;border:1.5px solid var(--ink)}
        .idocs-method.get{background:var(--green-t)}
        .idocs-method.post{background:var(--blue-t)}

        .idocs-autogrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .idocs-auto{border:var(--bd);border-radius:12px;background:var(--card);padding:16px;box-shadow:var(--hard-s)}
        .idocs-auto h4{font:800 .92rem var(--body);margin-bottom:6px}
        .idocs-auto p{font-size:.82rem;color:var(--ink-soft);line-height:1.5}

        .idocs-final{text-align:center;border:var(--bd);border-radius:16px;background:var(--ink);color:var(--paper);padding:44px 30px;box-shadow:var(--hard)}
        .idocs-final h2{font:400 clamp(1.6rem,3.6vw,2.3rem)/1.1 var(--disp);letter-spacing:.4px;text-transform:uppercase;margin-bottom:10px}
        .idocs-final p{color:rgba(245,243,235,.7);margin-bottom:22px}
        .idocs-final-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}

        @media(max-width:760px){
          .idocs-capgrid{grid-template-columns:1fr}
          .idocs-inputs{grid-template-columns:1fr}
          .idocs-autogrid{grid-template-columns:1fr}
          .idocs-table{font-size:.8rem}
        }
      `}</style>

      <div className="container idocs-top">
        <Link className="logo" href="/">
          <span className="logo-mark">C</span>
          <span className="logo-txt">Content<b>Flow</b></span>
        </Link>
        <div className="idocs-top-links">
          <Link className="idocs-back" href="/docs/mcp">
            Conectar uma IA direto (mais fácil) →
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/settings">
            Configurações
          </Link>
        </div>
      </div>

      <section className="container idocs-hero">
        <span className="eyebrow">integração · api</span>
        <h1>
          Ligue seus programas <span className="hl">ao ContentFlow</span>.
        </h1>
        <p>
          Uma API é um jeito de dois programas conversarem entre si sem tela nem
          clique — um deles "pede" algo e o ContentFlow responde. É assim que
          ferramentas como Zapier, Make, n8n ou um sistema seu conseguem criar
          conteúdo, gerar carrosséis e agendar posts automaticamente, sem você
          precisar abrir o site toda vez.
        </p>
        <div className="idocs-hero-actions">
          <a href="#comecar" className="btn btn-lime btn-lg">
            Ver como começar <span className="arr">↓</span>
          </a>
          <Link href="/settings" className="btn btn-dash btn-lg">
            Pegar minha API Key
          </Link>
        </div>
      </section>

      <section className="container" style={{ marginTop: 8 }}>
        <div className="idocs-note" style={{ maxWidth: 680 }}>
          <b>Não é desenvolvedor?</b> Você tem duas saídas fáceis: copie o
          endereço desta página e peça pra uma IA (ChatGPT, Claude) ler e montar
          a automação por você — ou, se o que você quer é só deixar uma IA
          controlando sua conta diretamente (tipo "agenda esse post pra mim"),
          use a <Link href="/docs/mcp">conexão MCP</Link>, que é mais simples
          ainda e não exige escrever nenhum código.
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">o que dá pra fazer</p>
            <h2>Três coisas, na prática</h2>
          </div>
          <div className="idocs-capgrid">
            <div className="idocs-cap">
              <span className="idocs-cap-emoji">🧬</span>
              <h3>Ensinar sua marca pra IA</h3>
              <p>
                Manda o link do seu site ou Instagram e o ContentFlow aprende
                sozinho seu tom de voz, público e o que faz sentido você postar.
              </p>
            </div>
            <div className="idocs-cap">
              <span className="idocs-cap-emoji">💡</span>
              <h3>Pedir ideias e carrosséis</h3>
              <p>
                Peça pra IA gerar ideias de post ou carrosséis prontos, com
                design e legenda, a partir de um tema que você escolher.
              </p>
            </div>
            <div className="idocs-cap">
              <span className="idocs-cap-emoji">🔔</span>
              <h3>Ser avisado quando terminar</h3>
              <p>
                Gerar conteúdo com IA leva alguns segundos — configure um
                webhook (um aviso automático) pra saber assim que ficar pronto.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper2)' }} id="comecar">
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">passo a passo</p>
            <h2>Como começar</h2>
            <p className="sec-sub">
              Preencha os dois campos abaixo — os comandos de exemplo se
              atualizam sozinhos com os seus dados.
            </p>
          </div>

          <div className="idocs-inputs">
            <div className="idocs-field">
              <label htmlFor="idocs-url">Endereço do seu ContentFlow</label>
              <input
                id="idocs-url"
                type="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://sua-instancia.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
            <div className="idocs-field">
              <label htmlFor="idocs-key">Sua API Key</label>
              <input
                id="idocs-key"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="cf_••••••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          <div className="idocs-steps">
            <Step n={1} title="Pegue sua API Key">
              <p>
                Vá em <b>Configurações → Acesso</b> e copie a chave. É como uma
                senha, só que feita pra programas usarem no seu lugar — ela é o
                jeito do ContentFlow saber que é você pedindo.
              </p>
            </Step>
            <Step n={2} title="Faça seu primeiro pedido de teste">
              <p>
                Esse comando pede pro ContentFlow listar suas marcas. Cole ele
                no terminal (ou peça pra uma IA rodar) e veja a resposta.
              </p>
              <CodeWindow title="terminal" code={firstRequestCode} />
            </Step>
            <Step n={3} title="Peça pra IA gerar um carrossel">
              <p>
                Esse comando pede um carrossel novo de 6 slides sobre um tema à
                sua escolha — troque <code>"id-da-sua-marca"</code> e{' '}
                <code>"topic"</code> pelos seus dados.
              </p>
              <CodeWindow title="terminal" code={generateCarouselCode} />
            </Step>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">referência técnica</p>
            <h2>O que cada pedido faz</h2>
            <p className="sec-sub">
              Toda vez que você chamar um desses endereços, inclua o header{' '}
              <code>Authorization</code> com sua API Key — é assim que o
              ContentFlow confirma que é você.
            </p>
          </div>
          {endpointGroups.map((group) => (
            <div className="idocs-group" key={group.title}>
              <div className="idocs-group-head">
                <h3>{group.title}</h3>
                <p>{group.desc}</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="idocs-table">
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th>Endereço</th>
                      <th>O que faz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map(([method, endpoint, desc]) => (
                      <tr key={endpoint + method}>
                        <td>
                          <span className={`idocs-method ${method.toLowerCase()}`}>
                            {method}
                          </span>
                        </td>
                        <td>
                          <code>{endpoint}</code>
                        </td>
                        <td>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper2)' }}>
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">avisos automáticos</p>
            <h2>Webhooks</h2>
            <p className="sec-sub">
              Um webhook é o ContentFlow te avisando sozinho quando algo
              acontece, em vez de você ficar checando toda hora. Você dá um
              endereço seu, e ele manda um aviso pra lá quando, por exemplo, um
              carrossel termina de ser gerado.
            </p>
          </div>

          <div className="idocs-group">
            <div className="idocs-group-head">
              <h3>Configurar um webhook</h3>
              <p>Diz pro ContentFlow pra onde mandar o aviso e de quais eventos.</p>
            </div>
            <CodeWindow title="terminal" code={webhookConfigCode} />
          </div>

          <div className="idocs-group">
            <div className="idocs-group-head">
              <h3>Conferir se o aviso é legítimo</h3>
              <p>
                Cada aviso vem com uma assinatura, pra você ter certeza que veio
                mesmo do ContentFlow e não de outra pessoa se passando por ele.
              </p>
            </div>
            <CodeWindow title="verify.js" code={verifySignatureCode} />
          </div>

          <div className="idocs-group">
            <div className="idocs-group-head">
              <h3>Avisos disponíveis</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="idocs-table">
                <tbody>
                  <tr>
                    <td><code>job.completed</code></td>
                    <td>Uma geração de conteúdo terminou com sucesso</td>
                  </tr>
                  <tr>
                    <td><code>job.failed</code></td>
                    <td>Uma geração de conteúdo falhou</td>
                  </tr>
                  <tr>
                    <td><code>idea.approved</code></td>
                    <td>Uma ideia foi aprovada no Content Swipe</td>
                  </tr>
                  <tr>
                    <td><code>project.created</code></td>
                    <td>Um novo projeto de carrossel foi criado</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head">
            <p className="eyebrow">sem escrever código</p>
            <h2>Ferramentas de automação</h2>
            <p className="sec-sub">
              Se você usa Make, Zapier ou n8n, dá pra conectar sem programar
              nada — só configurando blocos visuais.
            </p>
          </div>
          <div className="idocs-autogrid">
            <div className="idocs-auto">
              <h4>Make (Integromat)</h4>
              <p>Use o módulo HTTP pra chamar a API. Configure o webhook como gatilho (trigger).</p>
            </div>
            <div className="idocs-auto">
              <h4>Zapier</h4>
              <p>Use "Webhooks by Zapier" como gatilho e "Code by Zapier" pra conferir a assinatura.</p>
            </div>
            <div className="idocs-auto">
              <h4>n8n</h4>
              <p>Use o nó "HTTP Request" com o header Authorization. O nó "Webhook" serve como gatilho.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="idocs-final">
            <h2>Pronto pra ligar tudo?</h2>
            <p>
              Pegue sua API Key nas configurações — ou, se preferir que uma IA
              cuide de tudo sozinha, veja a conexão MCP.
            </p>
            <div className="idocs-final-actions">
              <Link href="/settings" className="btn btn-lime btn-lg">
                Ir para Configurações
              </Link>
              <Link href="/docs/mcp" className="btn btn-inv btn-lg">
                Ver conexão MCP
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
