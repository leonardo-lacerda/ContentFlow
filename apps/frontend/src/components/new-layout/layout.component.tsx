'use client';

import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { AnnouncementBanner } from '@gitroom/frontend/components/layout/announcement.banner';
import { Title } from '@gitroom/frontend/components/layout/title';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { JobsIndicator } from '@gitroom/frontend/components/generation-jobs/jobs-indicator.component';
import { OnboardingGate } from '@gitroom/frontend/components/layout/onboarding-gate.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';


export const LayoutComponent = memo(({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
  const checkParam = useMemo(() => searchParams.get('check') || '', [searchParams]);
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, error: userError, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  if (!user) {
    return (
      <main className="flex min-h-[100dvh] w-full items-center justify-center bg-cf-bg px-6 text-cf-text">
        <section className="w-full max-w-md rounded-2xl border border-cf-border bg-cf-surface p-8 text-center shadow-cf">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cf-accent text-xl font-semibold text-cf-ink">
            {userError ? '!' : '…'}
          </div>
          <h1 className="font-serif text-2xl font-semibold">
            {userError ? 'Não conseguimos abrir o ContentFlow' : 'Carregando o ContentFlow'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-cf-muted">
            {userError
              ? 'A sessão não pôde ser carregada agora. Verifique se o backend está online e tente novamente.'
              : 'Estamos carregando seu espaço de trabalho.'}
          </p>
          {userError && (
            <button
              type="button"
              onClick={() => mutate()}
              className="mt-6 rounded-xl bg-cf-accent px-5 py-3 text-sm font-semibold text-cf-ink transition hover:brightness-95"
            >
              Tentar novamente
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
        showDevConsole={false}
      >
        <MantineWrapper>
          <ToolTip />
          <Toaster />
          <CheckPayment check={checkParam} mutate={mutate}>
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <ContinueProvider />
            <div className="cf-app-shell box-border flex h-[100dvh] max-h-[100dvh] min-h-0 w-full min-w-0 overflow-hidden p-[12px] font-sans">
              {/* ContentFlow v1: FREE tem acesso ao loop (limites no backend). Sem paywall full-screen. */}
              <OnboardingGate>
                <>
                  <AnnouncementBanner />
                  <div className="flex min-h-0 flex-1 gap-[8px]">
                    <Support />
                    {/* Spacer keeps content offset; actual menu is fixed and expands on hover */}
                    <div className="flex flex-col w-[72px] shrink-0" aria-hidden />
                    <div
                      id="left-menu"
                      className={clsx(
                        'group/sidebar fixed z-[200] start-[12px] top-[12px]',
                        'h-[calc(100dvh-24px)] w-[72px] hover:w-[228px]',
                        'cf-app-sidebar flex flex-col',
                        'overflow-hidden transition-[width,box-shadow] duration-200 ease-out',
                        'hover:shadow-cf',
                        user?.admin && 'pt-[48px]'
                      )}
                    >
                      <div className="flex flex-col h-full gap-[10px] flex-1 py-[12px] px-[8px] min-h-0">
                        <Logo />
                        <TopMenu />
                      </div>
                    </div>
                    <div className="cf-main-frame flex min-h-0 min-w-0 flex-1 overflow-hidden flex-col gap-[1px] blurMe">
                      <div className="cf-topbar flex h-[72px] px-[20px] items-center">
                        <div className="text-[24px] font-[600] flex flex-1 min-w-0">
                          <Title />
                        </div>
                        <div className="flex gap-[20px] text-textItemBlur">
                          <StreakComponent />
                          <div className="w-[1px] h-[20px] bg-blockSeparator" />
                          <OrganizationSelector />
                          <div className="hover:text-newTextColor">
                            <ModeComponent />
                          </div>
                          <div className="w-[1px] h-[20px] bg-blockSeparator" />
                          <JobsIndicator />
                          <LanguageComponent />
                          <ChromeExtensionComponent />
                          <div className="w-[1px] h-[20px] bg-blockSeparator" />
                          <AttachToFeedbackIcon />
                          <NotificationComponent />
                        </div>
                      </div>
                      <div className="flex min-h-0 flex-1 gap-[1px]">{children}</div>
                    </div>
                  </div>
                </>
              </OnboardingGate>
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
});
