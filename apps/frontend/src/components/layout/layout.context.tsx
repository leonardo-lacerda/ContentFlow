'use client';

import { ReactNode, useCallback } from 'react';
import { FetchWrapperComponent } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useReturnUrl } from '@gitroom/frontend/app/(app)/auth/return.url.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
export default function LayoutContext(params: { children: ReactNode }) {
  if (params?.children) {
    // eslint-disable-next-line react/no-children-prop
    return <LayoutContextInner children={params.children} />;
  }
  return <></>;
}
export function setCookie(cname: string, cvalue: string, exdays: number) {
  if (typeof document === 'undefined') {
    return;
  }
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}
function LayoutContextInner(params: { children: ReactNode }) {
  const returnUrl = useReturnUrl();
  const { backendUrl, isSecured } = useVariables();
  const afterRequest = useCallback(
    async (url: string, options: RequestInit, response: Response) => {
      if (
        typeof window !== 'undefined' &&
        (window.location.href.includes('/p/') ||
          window.location.pathname.startsWith('/provider/'))
      ) {
        return true;
      }
      const headerAuth =
        response?.headers?.get('auth') || response?.headers?.get('Auth');
      const showOrg =
        response?.headers?.get('showorg') || response?.headers?.get('Showorg');
      const impersonate =
        response?.headers?.get('impersonate') ||
        response?.headers?.get('Impersonate');
      const logout =
        response?.headers?.get('logout') || response?.headers?.get('Logout');
      if (headerAuth) {
        setCookie('auth', headerAuth, 365);
      }
      if (showOrg) {
        setCookie('showorg', showOrg, 365);
      }
      if (impersonate) {
        setCookie('impersonate', impersonate, 365);
      }
      if (logout && !isSecured) {
        setCookie('auth', '', -10);
        setCookie('showorg', '', -10);
        setCookie('impersonate', '', -10);
        window.location.href = '/';
        return true;
      }
      const reloadOrOnboarding =
        response?.headers?.get('reload') ||
        response?.headers?.get('onboarding');
      if (reloadOrOnboarding) {
        const getAndClear = returnUrl.getAndClear();
        if (getAndClear) {
          window.location.href = getAndClear;
          return true;
        }
      }
      if (response?.headers?.get('onboarding')) {
        window.location.href = '/onboarding';
        return true;
      }

      if (response?.headers?.get('reload')) {
        if (window.location.pathname.startsWith('/auth')) {
          window.location.href = '/';
        } else {
          window.location.reload();
        }
        return true;
      }

      if (response.status === 401 || response?.headers?.get('logout')) {
        if (!isSecured) {
          // Cookies nao-seguros: o JS consegue limpar e voltar para a landing.
          setCookie('auth', '', -10);
          setCookie('showorg', '', -10);
          setCookie('impersonate', '', -10);
          window.location.href = '/';
        } else {
          // Cookies httpOnly nao podem ser limpos via JS. Usa o endpoint de
          // logout do servidor para apagar o cookie e evitar loop de redirect
          // (/ -> /launches -> 401 -> / ...) quando o token esta expirado/invalido.
          window.location.href = '/auth/logout';
        }
      }
      if (response.status === 406) {
        if (
          await deleteDialog(
            'You are currently on trial, in order to use the feature you must finish the trial',
            'Finish the trial, charge me now',
            'Trial',

          )
        ) {
          window.open('/billing?finishTrial=true', '_blank');
          return false;
        }
        return false;
      }

      if (response.status === 402) {
        try {
          const body = await response.json();
          const isPlanLimit = body.code === 'PLAN_LIMIT_EXCEEDED';
          const message = isPlanLimit
            ? `Limite do plano ${body.plan || ''} atingido.\n${body.type ? `Tipo: ${body.type}. ` : ''}Uso: ${body.current ?? '?'}/${body.limit ?? '?'}.\n${body.upgradeMessage || 'Faça upgrade para continuar.'}`
            : body.message || 'Payment Required';
          if (
            await deleteDialog(
              message,
              isPlanLimit ? 'Fazer upgrade' : 'Ir para billing',
              isPlanLimit ? 'Limite do plano' : 'Payment Required'
            )
          ) {
            window.location.href = '/billing';
            return false;
          }
        } catch {
          // fallback se JSON parsing falhar
          if (await deleteDialog('Payment Required', 'Ir para billing')) {
            window.location.href = '/billing';
            return false;
          }
        }
        return true;
      }
      return true;
    },
    []
  );
  return (
    <FetchWrapperComponent baseUrl={backendUrl} afterRequest={afterRequest}>
      {params?.children || <></>}
    </FetchWrapperComponent>
  );
}
