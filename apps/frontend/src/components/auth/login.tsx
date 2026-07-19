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
      <form className="flex w-full" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex w-full flex-col">
          <div>
            <div className="mb-[10px] inline-flex rounded-full border border-white/10 bg-white/[0.05] px-[12px] py-[6px] text-[12px] text-white/60">
              {t('welcome_back', 'Welcome back')}
            </div>
            <h1 className="text-start text-[34px] font-[600] leading-[1.02] tracking-[-1.2px] text-white md:text-[40px]">
              {t('sign_in', 'Sign In')}
            </h1>
            <p className="mt-[12px] text-[14px] leading-[1.6] text-white/58">
              {t(
                'access_your_workspace_and_keep_creating',
                'Acesse seu workspace e continue criando conteúdo.'
              )}
            </p>
          </div>
          <div className="mt-[28px] flex flex-col">
            <div className="mb-[12px] text-[13px] font-[500] text-white/62">
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
              <div className="absolute top-[50%] h-[1px] w-full -translate-y-[50%] bg-white/10" />
              <div className="absolute -top-[4px] start-0 z-[1] flex w-full items-center justify-center">
                <div className="bg-[#12141D] px-[16px] text-[13px] text-white/45">
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
                <div className="mb-[4px] rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-[14px]">
                  <p className="mb-[8px] text-sm leading-[1.55] text-amber-300">
                    {t(
                      'account_not_activated',
                      'Your account is not activated yet. Please check your email for the activation link.'
                    )}
                  </p>
                  <Link
                    href="/auth/activate"
                    className="text-sm text-amber-200 underline hover:text-amber-100"
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
                <p className="mt-[18px] text-sm text-white/54">
                  {t('don_t_have_an_account', "Don't Have An Account?")}&nbsp;
                  <Link
                    href="/auth"
                    className="cursor-pointer text-white underline hover:text-[#FCB7FF]"
                  >
                    {t('sign_up', 'Sign Up')}
                  </Link>
                </p>
                <p className="mt-[12px] text-sm">
                  <Link
                    href="/auth/forgot"
                    className="cursor-pointer text-white/72 underline hover:text-white"
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
