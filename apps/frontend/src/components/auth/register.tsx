'use client';

import { Suspense } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import clsx from 'clsx';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import useCookie from 'react-use-cookie';
type Inputs = {
  email: string;
  password: string;
  company: string;
  providerToken: string;
  provider: string;
};

function RegisterContent() {
  const getQuery = useSearchParams();
  const fetch = useFetch();
  const [provider] = useState(getQuery?.get('provider')?.toUpperCase());
  const [code, setCode] = useState(getQuery?.get('code') || '');
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (provider && code) {
      load();
    }
  }, []);
  const load = useCallback(async () => {
    const { token } = await (
      await fetch(`/auth/oauth/${provider?.toUpperCase() || 'LOCAL'}/exists`, {
        method: 'POST',
        body: JSON.stringify({
          code,
        }),
      })
    ).json();
    if (token) {
      setCode(token);
      setShow(true);
    }
  }, [provider, code]);
  if (!code && !provider) {
    return <RegisterAfter token="" provider="LOCAL" />;
  }
  if (!show) {
    return <LoadingComponent />;
  }
  return (
    <RegisterAfter token={code} provider={provider?.toUpperCase() || 'LOCAL'} />
  );
}

export function Register() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <RegisterContent />
    </Suspense>
  );
}
function getHelpfulReasonForRegistrationFailure(httpCode: number) {
  switch (httpCode) {
    case 400:
      return 'Email already exists';
    case 404:
      return 'Your browser got a 404 when trying to contact the API, the most likely reasons for this are the NEXT_PUBLIC_BACKEND_URL is set incorrectly, or the backend is not running.';
  }
  return 'Unhandled error: ' + httpCode;
}
export function RegisterAfter({
  token,
  provider,
}: {
  token: string;
  provider: string;
}) {
  const t = useT();
  const { isGeneral, genericOauth } = useVariables();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fireEvents = useFireEvents();
  const track = useTrack();
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');
  const isAfterProvider = useMemo(() => {
    return !!token && !!provider;
  }, [token, provider]);
  const resolver = useMemo(() => {
    return classValidatorResolver(CreateOrgUserDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      providerToken: token,
      provider: provider,
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    await fetchData('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        datafast_visitor_id,
      }),
    })
      .then(async (response) => {
        if (response.status === 200) {
          fireEvents('register');
          return track(TrackEnum.CompleteRegistration).then(() => {
            if (response.headers.get('activate') === 'true') {
              router.push('/auth/activate');
            } else {
              router.push('/auth/login');
            }
          });
        } else {
          form.setError('email', {
            message: await response.text(),
          });
        }
      })
      .catch((e) => {
        form.setError('email', {
          message:
            'General error: ' +
            e.toString() +
            '. Please check your browser console.',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  return (
    <FormProvider {...form}>
      <form className="flex w-full" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex w-full flex-col">
          <div>
            <div className="mb-[10px] inline-flex rounded-full border border-newBorder bg-cf-cream px-[12px] py-[6px] text-[12px] font-[600] text-cf-amber">
              {t('start_free', 'Start free')}
            </div>
            <h1 className="text-start font-serif text-[34px] font-[600] leading-[1.05] tracking-[-0.02em] text-cf-ink md:text-[40px]">
              {t('sign_up', 'Sign Up')}
            </h1>
            <p className="mt-[12px] text-[14px] leading-[1.6] text-cf-muted">
              {t(
                'start_creating_content_in_one_place',
                'Comece grátis e organize sua criação de conteúdo em um só lugar.'
              )}
            </p>
          </div>
          <div className="mt-[28px] flex flex-col">
            {!isAfterProvider && (
              <div className="mb-[12px] text-[13px] font-[500] text-cf-muted">
                {t('continue_with', 'Continue With')}
              </div>
            )}
            {!isAfterProvider &&
              (!isGeneral ? (
                <GithubProvider />
              ) : (
                <div className="flex gap-[8px]">
                  {genericOauth && isGeneral ? (
                    <OauthProvider />
                  ) : (
                    <GoogleProvider />
                  )}
                </div>
              ))}
            {!isAfterProvider && (
              <div className="relative my-[24px] h-[20px]">
                <div className="absolute top-[50%] h-[1px] w-full -translate-y-[50%] bg-newBorder" />
                <div className="absolute -top-[4px] start-0 z-[1] flex w-full items-center justify-center">
                  <div className="bg-white px-[16px] text-[13px] text-cf-muted">
                    {t('or', 'or')}
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-[14px]">
              <div className="text-textColor">
                {!isAfterProvider && (
                  <>
                    <Input
                      label="Email"
                      translationKey="label_email"
                      {...form.register('email')}
                      type="email"
                      placeholder={t('email_address', 'Email Address')}
                    />
                    <Input
                      label="Password"
                      translationKey="label_password"
                      {...form.register('password')}
                      autoComplete="off"
                      type="password"
                      placeholder={t('label_password', 'Password')}
                    />
                  </>
                )}
                <Input
                  label="Company"
                  translationKey="label_company"
                  {...form.register('company')}
                  autoComplete="off"
                  type="text"
                  placeholder={t('label_company', 'Company')}
                />
              </div>
              <div className={clsx('text-[12px] leading-[1.6] text-cf-muted')}>
                {t(
                  'by_registering_you_agree_to_our',
                  'By registering you agree to our'
                )}
                &nbsp;
                <a
                  href={`https://contentflow.com/terms`}
                  className="text-cf-ink underline hover:text-cf-amber"
                  rel="nofollow"
                >
                  {t('terms_of_service', 'Terms of Service')}
                </a>
                &nbsp;
                {t('and', 'and')}&nbsp;
                <a
                  href={`https://contentflow.com/privacy`}
                  rel="nofollow"
                  className="text-cf-ink underline hover:text-cf-amber"
                >
                  {t('privacy_policy', 'Privacy Policy')}
                </a>
                &nbsp;
              </div>
              <div className="mt-[12px] text-center">
                <div className="flex w-full">
                  <Button
                    type="submit"
                    className="flex-1 rounded-[14px] !h-[54px]"
                    loading={loading}
                  >
                    {t('create_account', 'Create Account')}
                  </Button>
                </div>
                <p className="mt-[18px] text-sm text-cf-muted">
                  {t('already_have_an_account', 'Already Have An Account?')}
                  &nbsp;
                  <Link
                    href="/auth/login"
                    className="cursor-pointer text-cf-ink underline hover:text-cf-amber"
                  >
                    {t('sign_in', 'Sign In')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
