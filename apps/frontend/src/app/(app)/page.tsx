import Link from 'next/link';

const channels = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'X', 'Threads'];

const features = [
  {
    title: 'Planeje tudo em um calendário',
    text: 'Organize campanhas, posts e aprovações em uma visão clara para todo o time.',
  },
  {
    title: 'Publique em 28+ canais',
    text: 'Crie uma vez, ajuste por plataforma e distribua no horário certo sem retrabalho.',
  },
  {
    title: 'Automação com controle',
    text: 'Fluxos inteligentes cuidam do agendamento enquanto você mantém aprovação final.',
  },
];

const steps = ['Crie o conteúdo', 'Escolha os canais', 'Agende a campanha'];

export default function Page() {
  return (
    <main className="min-h-screen bg-[#ffe17c] text-black">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-6 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-2 border-black bg-white px-4 py-3 shadow-[6px_6px_0_#000]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center border-2 border-black bg-[#171e19] text-lg font-black text-[#ffe17c] shadow-[3px_3px_0_#000]">
              CF
            </div>
            <span className="text-xl font-black tracking-[-0.04em]">
              ContentFlow
            </span>
          </div>
          <div className="hidden items-center gap-6 text-sm font-black uppercase tracking-[0.16em] md:flex">
            <a href="#features">Recursos</a>
            <a href="#workflow">Fluxo</a>
            <a href="#pricing">Planos</a>
          </div>
          <Link
            href="/auth"
            className="border-2 border-black bg-[#b7c6c2] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_#000] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            Entrar
          </Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="border-2 border-black bg-[#171e19] p-6 text-white shadow-[10px_10px_0_#000] sm:p-10 lg:p-12">
            <div className="mb-8 inline-flex border-2 border-black bg-[#b7c6c2] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-black shadow-[4px_4px_0_#000]">
              SaaS para times de conteúdo
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.07em] sm:text-7xl lg:text-8xl">
              Publique em todos os canais sem virar refém da planilha.
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-semibold leading-8 text-[#f8f4df] sm:text-xl">
              Uma central brutalmente simples para criar, aprovar, agendar e medir posts em redes sociais, chat apps e comunidades.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth"
                className="border-2 border-black bg-[#ffe17c] px-7 py-4 text-center text-base font-black uppercase text-black shadow-[6px_6px_0_#000] transition-transform hover:translate-x-1.5 hover:translate-y-1.5 hover:shadow-none"
              >
                Começar agora
              </Link>
              <a
                href="#features"
                className="border-2 border-white px-7 py-4 text-center text-base font-black uppercase text-white shadow-[6px_6px_0_#fff] transition-transform hover:translate-x-1.5 hover:translate-y-1.5 hover:shadow-none"
              >
                Ver recursos
              </a>
            </div>
          </div>

          <div className="relative border-2 border-black bg-white p-5 shadow-[10px_10px_0_#000] sm:p-7">
            <div className="absolute -right-3 -top-3 border-2 border-black bg-[#b7c6c2] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_#000]">
              Live board
            </div>
            <div className="mb-5 flex items-center justify-between border-2 border-black bg-[#ffe17c] p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Maio
                </p>
                <h2 className="text-3xl font-black tracking-[-0.05em]">
                  Campanha Q2
                </h2>
              </div>
              <div className="size-14 rotate-6 border-2 border-black bg-[#171e19] shadow-[4px_4px_0_#000]" />
            </div>

            <div className="grid gap-4">
              {channels.map((channel, index) => (
                <div
                  key={channel}
                  className="flex items-center justify-between border-2 border-black bg-[#f8f4df] p-4 shadow-[4px_4px_0_#000]"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center border-2 border-black bg-white text-sm font-black">
                      {index + 1}
                    </span>
                    <span className="font-black">{channel}</span>
                  </div>
                  <span className="border-2 border-black bg-[#b7c6c2] px-3 py-1 text-xs font-black uppercase">
                    Agendado
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {['124k', '38%', '28+'].map((metric, index) => (
                <div
                  key={metric}
                  className="border-2 border-black bg-[#171e19] p-4 text-center text-white"
                >
                  <p className="text-2xl font-black tracking-[-0.05em]">
                    {metric}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b7c6c2]">
                    {['Alcance', 'Menos tempo', 'Canais'][index]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">
            Conteúdo rápido, processo forte, visual impossível de ignorar.
          </h2>
          <p className="max-w-sm border-2 border-black bg-white p-4 text-base font-bold shadow-[5px_5px_0_#000]">
            Feito para equipes que querem escala sem perder personalidade, revisão e timing.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="border-2 border-black bg-white p-6 shadow-[7px_7px_0_#000] transition-transform hover:-translate-y-1"
            >
              <div className="mb-8 grid size-14 place-items-center border-2 border-black bg-[#ffe17c] text-2xl font-black shadow-[4px_4px_0_#000]">
                {index + 1}
              </div>
              <h3 className="text-2xl font-black tracking-[-0.04em]">
                {feature.title}
              </h3>
              <p className="mt-4 text-base font-semibold leading-7 text-[#171e19]">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="bg-[#171e19] px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="mb-4 inline-block border-2 border-black bg-[#b7c6c2] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-black shadow-[4px_4px_0_#000]">
              Workflow
            </p>
            <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl">
              Do rascunho ao post publicado em três movimentos.
            </h2>
          </div>
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-5 border-2 border-black bg-[#ffe17c] p-5 text-black shadow-[6px_6px_0_#b7c6c2]"
              >
                <span className="grid size-12 shrink-0 place-items-center border-2 border-black bg-white text-xl font-black">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.04em]">
                    {step}
                  </h3>
                  <p className="mt-1 font-semibold text-[#171e19]">
                    Tudo fica rastreável, colaborativo e pronto para escalar.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-6 border-2 border-black bg-white p-6 shadow-[10px_10px_0_#000] lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-[#171e19]">
              Pronto para publicar melhor?
            </p>
            <h2 className="text-4xl font-black leading-none tracking-[-0.06em] sm:text-6xl">
              Troque caos por cadência.
            </h2>
            <p className="mt-4 max-w-2xl text-lg font-semibold leading-8">
              Centralize planejamento, aprovações, automações e analytics em uma experiência SaaS com energia de marca.
            </p>
          </div>
          <Link
            href="/auth"
            className="border-2 border-black bg-[#171e19] px-8 py-5 text-center text-base font-black uppercase text-white shadow-[6px_6px_0_#000] transition-transform hover:translate-x-1.5 hover:translate-y-1.5 hover:shadow-none"
          >
            Criar conta
          </Link>
        </div>
      </section>
    </main>
  );
}
