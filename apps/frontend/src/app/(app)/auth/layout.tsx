import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import Link from 'next/link';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';

export const dynamic = 'force-dynamic';

const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

const features = [
  {
    title: 'Imagens com IA',
    description: 'Transforme ideias em criativos prontos para publicar.',
  },
  {
    title: 'Calendário inteligente',
    description: 'Planeje campanhas e mantenha todos os canais em ritmo.',
  },
  {
    title: 'Múltiplos canais',
    description: 'Organize a distribuição para redes sociais e comunidades.',
  },
];

const channels = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube'];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-screen overflow-x-hidden bg-[#080A12] text-white">
      <ReturnUrlComponent />
      <Link
        href="/onboarding/company"
        className="absolute right-[16px] top-[16px] z-30 rounded-[10px] border border-white/20 bg-white/10 px-[12px] py-[8px] text-[12px] font-[600] text-white transition hover:bg-white/18"
      >
        Onboarding
      </Link>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(252,105,255,0.22),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(97,43,211,0.28),transparent_30%),linear-gradient(135deg,#080A12_0%,#111827_52%,#0E0E0E_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <main className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-[28px] px-[18px] py-[18px] lg:grid-cols-[minmax(0,1fr)_500px] lg:px-[40px] lg:py-[32px] xl:gap-[56px]">
        <section className="order-2 flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-[22px] shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur lg:order-1 lg:p-[34px]">
          <div>
            <div className="mb-[42px] hidden lg:block">
              <LogoTextComponent />
            </div>
            <div className="inline-flex items-center gap-[8px] rounded-full border border-white/10 bg-white/[0.06] px-[14px] py-[8px] text-[13px] text-white/78">
              <span className="h-[7px] w-[7px] rounded-full bg-[#FC69FF] shadow-[0_0_22px_rgba(252,105,255,0.9)]" />
              Plataforma de conteúdo com IA
            </div>
            <h1 className="mt-[22px] max-w-[760px] text-[42px] font-[600] leading-[0.98] tracking-[-2.4px] text-white md:text-[64px] xl:text-[78px]">
              Crie conteúdo com IA em minutos.
            </h1>
            <p className="mt-[20px] max-w-[640px] text-[16px] leading-[1.7] text-white/68 md:text-[18px]">
              Planeje campanhas, gere criativos e organize publicações em um
              fluxo simples para transformar ideias em posts prontos.
            </p>
            <div className="mt-[28px] grid gap-[12px] md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[18px] border border-white/10 bg-[#0F1320]/80 p-[16px]"
                >
                  <div className="text-[15px] font-[600] text-white">
                    {feature.title}
                  </div>
                  <div className="mt-[8px] text-[13px] leading-[1.55] text-white/58">
                    {feature.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-[34px] grid gap-[18px] xl:grid-cols-[1fr_240px]">
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#111625]/90 p-[18px] shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
              <div className="mb-[18px] flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-white/48">Campanha atual</div>
                  <div className="text-[18px] font-[600] text-white">
                    Lançamento de verão
                  </div>
                </div>
                <div className="rounded-full bg-[#FC69FF]/15 px-[12px] py-[6px] text-[12px] text-[#FCB7FF]">
                  IA ativa
                </div>
              </div>
              <div className="grid gap-[12px] md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[20px] bg-gradient-to-br from-[#612BD3] via-[#D82D7E] to-[#FC69FF] p-[1px]">
                  <div className="h-full rounded-[19px] bg-[#151827] p-[16px]">
                    <div className="h-[180px] rounded-[16px] bg-[radial-gradient(circle_at_30%_20%,rgba(252,255,255,0.85),transparent_16%),linear-gradient(135deg,#6545F5,#FC69FF_52%,#FFB86B)]" />
                    <div className="mt-[14px] h-[10px] w-[78%] rounded-full bg-white/18" />
                    <div className="mt-[8px] h-[10px] w-[52%] rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="grid gap-[10px]">
                  {channels.map((channel, index) => (
                    <div
                      key={channel}
                      className="flex items-center justify-between rounded-[16px] border border-white/10 bg-white/[0.04] px-[14px] py-[12px]"
                    >
                      <div>
                        <div className="text-[13px] font-[600] text-white">
                          {channel}
                        </div>
                        <div className="mt-[4px] text-[12px] text-white/45">
                          {index + 2} posts agendados
                        </div>
                      </div>
                      <div className="h-[34px] w-[34px] rounded-full bg-[#FC69FF]/15 text-center text-[18px] leading-[34px] text-[#FCB7FF]">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#0F1320]/85 p-[18px]">
              <div className="text-[13px] text-white/48">Prova social</div>
              <div className="mt-[10px] text-[34px] font-[600] tracking-[-1.2px] text-white">
                20k+
              </div>
              <p className="mt-[8px] text-[13px] leading-[1.6] text-white/60">
                empreendedores usam o ContentFlow para acelerar a criação e
                publicação de conteúdo.
              </p>
              <div className="mt-[18px] rounded-[18px] bg-white/[0.05] p-[14px] text-[13px] leading-[1.55] text-white/70">
                “A rotina de conteúdo ficou mais rápida e organizada em um só
                lugar.”
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center lg:order-2">
          <div className="w-full rounded-[28px] border border-white/12 bg-[#12141D]/92 p-[18px] shadow-[0_24px_90px_rgba(0,0,0,0.5)] backdrop-blur md:p-[28px] lg:p-[34px]">
            <div className="mx-auto flex w-full max-w-[440px] flex-col gap-[30px]">
              <div className="lg:hidden">
                <LogoTextComponent />
              </div>
              <div className="hidden lg:block">
                <LogoTextComponent />
              </div>
              <div className="flex w-full">{children}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
