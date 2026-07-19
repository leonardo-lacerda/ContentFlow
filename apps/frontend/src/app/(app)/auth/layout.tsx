import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import Link from 'next/link';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';

export const dynamic = 'force-dynamic';

const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));

const features = [
  {
    title: 'Brand DNA',
    description: 'Identidade persistente em cada geração de conteúdo.',
  },
  {
    title: 'Estúdio de carrosséis',
    description: 'Slides e copy no tom da marca, em minutos.',
  },
  {
    title: 'Calendário multi-canal',
    description: 'Agende e publique onde sua audiência está.',
  },
];

const channels = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube'];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-screen overflow-x-hidden bg-cf-offwhite text-cf-ink">
      <ReturnUrlComponent />
      <Link
        href="/onboarding"
        className="absolute right-[16px] top-[16px] z-30 rounded-[10px] border border-newBorder bg-white px-[12px] py-[8px] text-[12px] font-[600] text-cf-ink transition hover:bg-cf-cream"
      >
        Onboarding
      </Link>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,#f7f2ea_0%,rgba(247,242,234,0)_50%)]" />
      <main className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-[28px] px-[18px] py-[18px] lg:grid-cols-[minmax(0,1fr)_480px] lg:px-[40px] lg:py-[32px] xl:gap-[48px]">
        <section className="order-2 flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[24px] border border-newBorder bg-white p-[22px] shadow-cf lg:order-1 lg:p-[34px]">
          <div>
            <div className="mb-[36px] hidden lg:block">
              <LogoTextComponent />
            </div>
            <div className="inline-flex items-center gap-[8px] rounded-full border border-newBorder bg-cf-cream px-[14px] py-[8px] text-[13px] font-[600] text-cf-amber">
              <span className="h-[7px] w-[7px] rounded-full bg-cf-amber" />
              IA + Brand DNA + multi-rede
            </div>
            <h1 className="mt-[22px] max-w-[760px] font-serif text-[40px] font-[600] leading-[1.05] tracking-[-0.02em] text-cf-ink md:text-[56px] xl:text-[64px]">
              Da marca ao post publicado, no tom certo.
            </h1>
            <p className="mt-[18px] max-w-[560px] text-[16px] leading-[1.65] text-cf-muted md:text-[17px]">
              Extraia o DNA do site, gere carrosséis e posts alinhados, agenda em
              dezenas de canais e aprenda com o que performa.
            </p>
            <div className="mt-[28px] grid gap-[12px] md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[16px] border border-newBorder bg-cf-offwhite p-[16px]"
                >
                  <div className="text-[15px] font-[600] text-cf-ink">
                    {feature.title}
                  </div>
                  <div className="mt-[8px] text-[13px] leading-[1.55] text-cf-muted">
                    {feature.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-[34px] grid gap-[18px] xl:grid-cols-[1fr_220px]">
            <div className="overflow-hidden rounded-[20px] border border-newBorder bg-cf-cream p-[18px]">
              <div className="mb-[16px] flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-[700] uppercase tracking-[0.08em] text-cf-muted">
                    Estúdio
                  </div>
                  <div className="text-[17px] font-[600] text-cf-ink">
                    Carrossel · Brand DNA
                  </div>
                </div>
                <div className="rounded-full bg-cf-okBg px-[12px] py-[6px] text-[12px] font-[700] text-cf-ok">
                  Ativo
                </div>
              </div>
              <div className="grid gap-[12px] md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[16px] border border-[#f3e6d8] bg-[#f7f2ea] p-[18px] min-h-[200px] flex flex-col justify-between">
                  <div className="text-[11px] font-[700] tracking-[0.1em] text-cf-muted opacity-70">
                    SUA MARCA
                  </div>
                  <div className="font-serif text-[24px] font-[600] leading-[1.15] text-cf-ink">
                    5 erros que travam o crescimento
                  </div>
                  <div className="text-[12px] font-[700] text-cf-amber">
                    Arraste →
                  </div>
                </div>
                <div className="grid gap-[10px]">
                  {channels.map((channel, index) => (
                    <div
                      key={channel}
                      className="flex items-center justify-between rounded-[12px] border border-newBorder bg-white px-[14px] py-[12px]"
                    >
                      <div>
                        <div className="text-[13px] font-[600] text-cf-ink">
                          {channel}
                        </div>
                        <div className="mt-[2px] text-[12px] text-cf-muted">
                          {index + 2} posts agendados
                        </div>
                      </div>
                      <div className="h-[32px] w-[32px] rounded-full bg-cf-amberSoft text-center text-[14px] font-[700] leading-[32px] text-cf-amberDark">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-newBorder bg-white p-[18px]">
              <div className="text-[12px] font-[700] uppercase tracking-[0.08em] text-cf-muted">
                Loop
              </div>
              <div className="mt-[10px] font-serif text-[28px] font-[600] tracking-[-0.02em] text-cf-ink">
                DNA → post
              </div>
              <p className="mt-[8px] text-[13px] leading-[1.5] text-cf-muted">
                Identidade, criação, distribuição e inteligência no mesmo fluxo.
              </p>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center justify-center lg:order-2">
          <div className="w-full max-w-[440px] rounded-[20px] border border-newBorder bg-white p-[24px] shadow-cfSm md:p-[28px]">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
