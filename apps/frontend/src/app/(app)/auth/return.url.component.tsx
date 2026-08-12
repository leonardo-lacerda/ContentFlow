'use client';

import { useSearchParams } from 'next/navigation';
import { FC, useCallback, useEffect } from 'react';
const ReturnUrlComponent: FC = () => {
  const params = useSearchParams();
  const url = params.get('returnUrl');
  useEffect(() => {
    if (!url) return;
    try {
      const targetUrl = new URL(url, window.location.origin);
      if (targetUrl.origin !== window.location.origin) return;
      localStorage.setItem(
        'returnUrl',
        `${targetUrl.pathname}${targetUrl.search}`
      );
    } catch {
      // Ignore malformed return URLs and keep the normal post-login flow.
    }
  }, [url]);
  return null;
};
export const useReturnUrl = () => {
  return {
    getAndClear: useCallback(() => {
      const data = localStorage.getItem('returnUrl');
      localStorage.removeItem('returnUrl');
      return data;
    }, []),
  };
};
export default ReturnUrlComponent;
