'use client';

import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { Plus_Jakarta_Sans } from 'next/font/google';
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
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
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

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const LayoutComponent = memo(({ children }: { children: ReactNode }) => {
  const fetch = useFetch();

  const { backendUrl } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
  const checkParam = useMemo(() => searchParams.get('check') || '', [searchParams]);
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  if (!user) return null;

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
            <div
              className={clsx(
                'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]',
                jakartaSans.className
              )}
            >
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {/* ContentFlow v1: FREE tem acesso ao loop (limites no backend). Sem paywall full-screen. */}
              <OnboardingGate>
                <>
                  <AnnouncementBanner />
                  <div className="flex-1 flex gap-[8px]">
                    <Support />
                    {/* Spacer keeps content offset; actual menu is fixed and expands on hover */}
                    <div className="flex flex-col w-[72px] shrink-0" aria-hidden />
                    <div
                      id="left-menu"
                      className={clsx(
                        'group/sidebar fixed z-[200] start-[12px] top-[12px]',
                        'h-[calc(100dvh-24px)] w-[72px] hover:w-[228px]',
                        'flex flex-col bg-newBgColorInner rounded-[12px]',
                        'overflow-hidden transition-[width,box-shadow] duration-200 ease-out',
                        'hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]',
                        user?.admin && 'pt-[48px]'
                      )}
                    >
                      <div className="flex flex-col h-full gap-[10px] flex-1 py-[12px] px-[8px] min-h-0">
                        <Logo />
                        <TopMenu />
                      </div>
                    </div>
                    <div className="flex-1 bg-newBgLineColor rounded-[12px] overflow-hidden flex flex-col gap-[1px] blurMe">
                      <div className="flex bg-newBgColorInner h-[80px] px-[20px] items-center">
                        <div className="text-[24px] font-[600] flex flex-1">
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
                      <div className="flex flex-1 gap-[1px]">{children}</div>
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
