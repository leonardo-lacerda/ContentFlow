import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ContentFlow - Documentação de Integração',
  description: 'Como integrar o ContentFlow com suas ferramentas via API, webhooks e automações',
};

export default function IntegrationDocsPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-12">
      <nav className="text-sm" style={{ color: 'var(--muted, #888)' }}>
        <Link href="/">Início</Link> / <span>Documentação</span>
      </nav>

      <h1 className="text-3xl font-bold">Documentação de Integração</h1>
      <p className="text-lg" style={{ color: 'var(--muted, #888)' }}>
        Integre o ContentFlow com suas ferramentas favoritas via API REST, webhooks e automações.
      </p>

      {/* Quick Start */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Início Rápido</h2>
        <div className="border rounded-lg p-6 space-y-4" style={{ background: 'var(--card, white)' }}>
          <h3 className="font-semibold">1. Obtenha sua API Key</h3>
          <p className="text-sm">Vá em <strong>Settings &gt; API Keys</strong> e gere uma chave.</p>

          <h3 className="font-semibold">2. Faça sua primeira requisição</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded text-sm font-mono overflow-x-auto">
            <pre>{`curl -X GET https://api.contentflow.com/public/v1/brands \\
  -H "Authorization: cf_sua_api_key_aqui"`}</pre>
          </div>

          <h3 className="font-semibold">3. Gere um carrossel</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded text-sm font-mono overflow-x-auto">
            <pre>{`curl -X POST https://api.contentflow.com/public/v1/carousel-projects/generate \\
  -H "Authorization: cf_sua_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "brandProfileId": "uuid-da-marca",
    "topic": "5 dicas de produtividade",
    "slideCount": 6,
    "platform": "instagram"
  }'`}</pre>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Autenticação</h2>
        <div className="border rounded-lg p-6 space-y-3" style={{ background: 'var(--card, white)' }}>
          <p>Use o header <code className="bg-gray-100 px-1 rounded">Authorization</code> em todas as requisições:</p>
          <div className="bg-gray-900 text-green-400 p-4 rounded text-sm font-mono">
            <pre>{`Authorization: cf_sua_api_key_aqui`}</pre>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted, #888)' }}>
            Suporta API Keys (prefixo <code>cf_</code>) e OAuth tokens (prefixo <code>pos_</code>).
          </p>
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Endpoints Disponíveis</h2>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Marcas (Brands)</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="p-3 text-left">Método</th><th className="p-3 text-left">Endpoint</th><th className="p-3 text-left">Descrição</th></tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/brands</code></td><td className="p-3">Listar marcas</td></tr>
                <tr className="border-t"><td className="p-3"><code>POST</code></td><td className="p-3"><code>/public/v1/brands</code></td><td className="p-3">Criar marca</td></tr>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/brands/:id</code></td><td className="p-3">Detalhes da marca</td></tr>
                <tr className="border-t"><td className="p-3"><code>POST</code></td><td className="p-3"><code>/public/v1/brands/:id/analyze</code></td><td className="p-3">Extrair Brand DNA</td></tr>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/brands/:id/dna</code></td><td className="p-3">Obter Brand DNA</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold">Ideias (Content Ideas)</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="p-3 text-left">Método</th><th className="p-3 text-left">Endpoint</th><th className="p-3 text-left">Descrição</th></tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/content-ideas</code></td><td className="p-3">Listar ideias</td></tr>
                <tr className="border-t"><td className="p-3"><code>POST</code></td><td className="p-3"><code>/public/v1/content-ideas/generate</code></td><td className="p-3">Gerar ideias com IA</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold">Carrosséis (Carousel Projects)</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="p-3 text-left">Método</th><th className="p-3 text-left">Endpoint</th><th className="p-3 text-left">Descrição</th></tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/carousel-projects</code></td><td className="p-3">Listar projetos</td></tr>
                <tr className="border-t"><td className="p-3"><code>POST</code></td><td className="p-3"><code>/public/v1/carousel-projects/generate</code></td><td className="p-3">Gerar carrossel com IA</td></tr>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/carousel-projects/:id</code></td><td className="p-3">Detalhes do projeto</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold">Jobs de Geração</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="p-3 text-left">Método</th><th className="p-3 text-left">Endpoint</th><th className="p-3 text-left">Descrição</th></tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/generation-jobs</code></td><td className="p-3">Listar jobs</td></tr>
                <tr className="border-t"><td className="p-3"><code>GET</code></td><td className="p-3"><code>/public/v1/generation-jobs/:id</code></td><td className="p-3">Status do job</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Webhooks</h2>
        <div className="border rounded-lg p-6 space-y-4" style={{ background: 'var(--card, white)' }}>
          <h3 className="font-semibold">Configurar Webhook</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded text-sm font-mono overflow-x-auto">
            <pre>{`curl -X POST https://api.contentflow.com/webhooks \\
  -H "Authorization: cf_sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://seu-site.com/webhook",
    "events": ["job.completed", "job.failed"]
  }'`}</pre>
          </div>

          <h3 className="font-semibold">Verificar Assinatura</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded text-sm font-mono overflow-x-auto">
            <pre>{`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
          </div>

          <h3 className="font-semibold">Eventos Disponíveis</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><code>job.completed</code> — Job de geração concluído com sucesso</li>
            <li><code>job.failed</code> — Job de geração falhou</li>
            <li><code>idea.approved</code> — Ideia aprovada no Content Swipe</li>
            <li><code>project.created</code> — Novo projeto de carrossel criado</li>
          </ul>
        </div>
      </section>

      {/* Automations */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Automações</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 space-y-2" style={{ background: 'var(--card, white)' }}>
            <h3 className="font-semibold">Make (Integromat)</h3>
            <p className="text-sm" style={{ color: 'var(--muted, #888)' }}>
              Use o módulo HTTP para chamar a API. Configure o webhook como trigger.
            </p>
          </div>
          <div className="border rounded-lg p-4 space-y-2" style={{ background: 'var(--card, white)' }}>
            <h3 className="font-semibold">Zapier</h3>
            <p className="text-sm" style={{ color: 'var(--muted, #888)' }}>
              Use Webhooks by Zapier como trigger e Code by Zapier para assinatura HMAC.
            </p>
          </div>
          <div className="border rounded-lg p-4 space-y-2" style={{ background: 'var(--card, white)' }}>
            <h3 className="font-semibold">n8n</h3>
            <p className="text-sm" style={{ color: 'var(--muted, #888)' }}>
              Use o nó HTTP Request com header Authorization. Webhook node como trigger.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center p-8 rounded-lg" style={{ background: 'var(--card, white)', border: '1px solid var(--border, #e5e7eb)' }}>
        <h2 className="text-xl font-bold mb-4">Pronto para integrar?</h2>
        <p className="mb-4" style={{ color: 'var(--muted, #888)' }}>
          Acesse a documentação interativa da API ou gere sua API Key.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/docs"
            className="inline-block px-6 py-3 text-white rounded-lg font-medium"
            style={{ background: 'var(--primary, #3b82f6)' }}
          >
            Ver API Docs (Swagger)
          </Link>
          <Link
            href="/settings"
            className="inline-block px-6 py-3 border rounded-lg font-medium"
          >
            Gerar API Key
          </Link>
        </div>
      </div>
    </main>
  );
}
