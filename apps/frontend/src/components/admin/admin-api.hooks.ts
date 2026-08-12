'use client';

import useSWR, { KeyedMutator } from 'swr';
import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export class AdminStepUpRequiredError extends Error {
  constructor() {
    super('ADMIN_STEP_UP_REQUIRED');
  }
}

export class AdminSessionInvalidError extends Error {
  constructor() {
    super('ADMIN_SESSION_INVALID');
  }
}

// Every admin panel call goes through this so a 401 (no/expired admin
// session) or a 403 ADMIN_STEP_UP_REQUIRED (MFA re-verify needed for a
// CRITICAL action) surface as typed errors the UI can react to, instead of
// silently failing or crashing on `.json()`.
export const useAdminFetch = () => {
  const fetch = useFetch();

  return useCallback(
    async (url: string, options?: RequestInit) => {
      let res = await fetch(url, options);
      if (res.status === 401) {
        let code: string | undefined;
        try {
          code = (await res.clone().json())?.code;
        } catch {
          // ignore
        }
        if (code === 'ADMIN_SESSION_INVALID') {
          const refreshed = await fetch('/admin/auth/refresh', { method: 'POST' });
          if (refreshed.ok) {
            res = await fetch(url, options);
          } else {
            throw new AdminSessionInvalidError();
          }
        }
      }
      if (res.status === 403) {
        let code: string | undefined;
        try {
          code = (await res.clone().json())?.code;
        } catch {
          // ignore
        }
        if (code === 'ADMIN_STEP_UP_REQUIRED') {
          throw new AdminStepUpRequiredError();
        }
      }
      return res;
    },
    [fetch]
  );
};

export interface AdminStatus {
  isAdmin: boolean;
  role?: string;
  status?: string;
  mfaEnabled?: boolean;
  permissions?: Record<string, boolean>;
}

export const useAdminStatus = () => {
  const fetch = useFetch();
  return useSWR<AdminStatus>('/admin/auth/status', async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load admin status');
    return res.json();
  });
};

export interface AdminSessionRow {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  mfaVerifiedAt: string | null;
  current: boolean;
}

export const useAdminSessions = () => {
  const adminFetch = useAdminFetch();
  return useSWR<AdminSessionRow[]>('/admin/auth/sessions', async (url: string) => {
    const res = await adminFetch(url);
    if (!res.ok) throw new Error('Failed to load sessions');
    return res.json();
  });
};

// Generic paginated-list hook shared by every admin panel — one shape
// (`{items,total,page,limit,hasMore}`) is used across users/orgs/audit/etc.
export interface AdminListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const useAdminList = <T,>(
  key: string | null
): {
  data: AdminListResponse<T> | undefined;
  isLoading: boolean;
  error: unknown;
  mutate: KeyedMutator<AdminListResponse<T>>;
} => {
  const adminFetch = useAdminFetch();
  const { data, isLoading, error, mutate } = useSWR<AdminListResponse<T>>(
    key,
    async (url: string) => {
      const res = await adminFetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const payload = await res.json();
      if (Array.isArray(payload)) {
        const limit = 25;
        return { items: payload, total: payload.length, page: 0, limit, hasMore: false };
      }
      if (payload && !Array.isArray(payload.items) && payload.items === undefined) {
        return { items: [payload], total: 1, page: 0, limit: 1, hasMore: false };
      }
      return payload;
    }
  );
  return { data, isLoading, error, mutate };
};
