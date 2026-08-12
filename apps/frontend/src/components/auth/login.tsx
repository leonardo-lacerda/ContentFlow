'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { GithubProvider } from '@gitroom/frontend/components/auth/providers/github.provider';
import { OauthProvider } from '@gitroom/frontend/components/auth/providers/oauth.provider';
import { GoogleProvider } from '@gitroom/frontend/components/auth/providers/google.provider';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSearchParams } from 'next/navigation';

function getSafeReturnUrl(value: string | null) {
  if (!value || typeof window === 'undefined') return null;
  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

function persistAuthCookie(token: string) {
  document.cookie = `auth=${encodeURIComponent(token)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

type Inputs = {
  email: string;
  password: string;
  providerToken: '';
  provider: 'LOCAL';
};
export function Login() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [notActivated, setNotActivated] = useState(false);
  const { isGeneral, genericOauth } = useVariables();
  const searchParams = useSearchParams();
  const resolver = useMemo(() => {
    return classValidatorResolver(LoginUserDto);
  }, []);
  const form = useForm<Inputs>({
    resolver,
    defaultValues: {
      providerToken: '',
      provider: 'LOCAL',
    },
  });
  const fetchData = useFetch();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);
    setNotActivated(false);
    const login = await fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        provider: 'LOCAL',
      }),
    });
    if (login.ok) {
      const responseAuth = login.headers.get('auth');
      if (responseAuth) persistAuthCookie(responseAuth);

      const returnUrl =
        getSafeReturnUrl(searchParams.get('returnUrl')) ||
        getSafeReturnUrl(localStorage.getItem('returnUrl')) ||
        '/';
      localStorage.removeItem('returnUrl');
      window.location.replace(returnUrl);
      return;
    }
    if (login.status === 400) {
      const errorMessage = await login.text();
      if (errorMessage === 'User is not activated') {
        setNotActivated(true);
      } else {
        form.setError('email', {
          message: errorMessage,
        });
      }
      setLoading(false);
    }
  };
  return (
    <FormProvider {...form}>
      <form suppressHydrationWarning className="flex w-full" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex w-full flex-col">
          <div>
            <div className="mb-[10px] inline-flex rounded-full border border-newBorder bg-cf-cream px-[12px] py-[6px] text-[12px] font-[600] text-cf-amber">
              {t('welcome_back', 'Welcome back')}
            </div>
            {/* i18next resolves the saved language on the client after SSR. */}
            <h1 suppressHydrationWarning className="text-start font-serif text-[34px] font-[600] leading-[1.05] tracking-[-0.02em] text-cf-ink md:text-[40px]">
              {t('sign_in', 'Sign In')}
            </h1>
            <p className="mt-[12px] text-[14px] leading-[1.6] text-cf-muted">
              {t(
                'access_your_workspace_and_keep_creating',
                'Acesse seu workspace e continue criando conteúdo.'
              )}
            </p>
          </div>
          <div className="mt-[28px] flex flex-col">
            <div className="mb-[12px] text-[13px] font-[500] text-cf-muted">
              {t('continue_with', 'Continue With')}
            </div>
            {isGeneral && genericOauth ? (
              <OauthProvider />
            ) : !isGeneral ? (
              <GithubProvider />
            ) : (
              <div className="flex gap-[8px]">
                <GoogleProvider />
              </div>
            )}
            <div className="relative my-[24px] h-[20px]">
              <div className="absolute top-[50%] h-[1px] w-full -translate-y-[50%] bg-newBorder" />
              <div className="absolute -top-[4px] start-0 z-[1] flex w-full items-center justify-center">
                <div className="bg-white px-[16px] text-[13px] text-cf-muted">
                  {t('or', 'or')}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[14px]">
              <div className="text-textColor">
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
              </div>
              {notActivated && (
                <div className="mb-[4px] rounded-[14px] border border-amber-300 bg-amber-50 p-[14px]">
                  <p className="mb-[8px] text-sm leading-[1.55] text-amber-800">
                    {t(
                      'account_not_activated',
                      'Your account is not activated yet. Please check your email for the activation link.'
                    )}
                  </p>
                  <Link
                    href="/auth/activate"
                    className="text-sm text-amber-700 underline hover:text-amber-900"
                  >
                    {t('resend_activation_email', 'Resend Activation Email')}
                  </Link>
                </div>
              )}
              <div className="mt-[12px] text-center">
                <div className="flex w-full">
                  <Button
                    type="submit"
                    className="flex-1 rounded-[14px] !h-[54px]"
                    loading={loading}
                  >
                    {t('sign_in_1', 'Sign in')}
                  </Button>
                </div>
                <p className="mt-[18px] text-sm text-cf-muted">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <Link
                    href="/auth"
                    className="cursor-pointer text-cf-ink underline hover:text-cf-amber"
                  >
                    {t('sign_up', 'Sign Up')}
                  </Link>
                </p>
                <p className="mt-[12px] text-sm">
                  <Link
                    href="/auth/forgot"
                    className="cursor-pointer text-cf-muted underline hover:text-cf-ink"
                  >
                    {t('forgot_password', 'Forgot password')}
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
