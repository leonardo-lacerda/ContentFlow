'use client';

import React, { FC, useCallback, useState } from 'react';
import { useAdminFetch, useAdminStatus } from '@gitroom/frontend/components/admin/admin-api.hooks';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

// Bootstraps the elevated `admin_auth` session on top of the regular user
// session: enroll TOTP (first time only) -> confirm with a code -> verify
// with a code to actually mint the admin session. See AdminSecurityController.
export const AdminLoginComponent: FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const { data: status, isLoading, mutate } = useAdminStatus();
  const adminFetch = useAdminFetch();
  const toaster = useToaster();

  const [enrollment, setEnrollment] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const startEnroll = useCallback(async () => {
    setBusy(true);
    try {
      const res = await adminFetch('/admin/auth/mfa/enroll', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toaster.show(body?.message || 'Failed to start MFA enrollment', 'warning');
        return;
      }
      const body = await res.json();
      setEnrollment({ qrDataUrl: body.qrDataUrl, secret: body.secret });
    } finally {
      setBusy(false);
    }
  }, [adminFetch, toaster]);

  const confirmEnroll = useCallback(async () => {
    setBusy(true);
    try {
      const res = await adminFetch('/admin/auth/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toaster.show(body?.message || 'Invalid code', 'warning');
        return;
      }
      const body = await res.json();
      setBackupCodes(body.backupCodes);
      setCode('');
      await mutate();
    } finally {
      setBusy(false);
    }
  }, [adminFetch, code, mutate, toaster]);

  const verify = useCallback(async () => {
    setBusy(true);
    try {
      const res = await adminFetch('/admin/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toaster.show(body?.message || 'Invalid code', 'warning');
        return;
      }
      toaster.show('Admin session started', 'success');
      onVerified();
    } finally {
      setBusy(false);
    }
  }, [adminFetch, code, onVerified, toaster]);

  if (isLoading) return <LoadingComponent />;

  if (!status?.isAdmin) {
    return (
      <div className="text-textColor p-[24px] max-w-[480px] mx-auto text-center">
        <div className="text-[18px] font-[600] mb-[8px]">No admin access</div>
        <div className="opacity-70 text-[14px]">
          Your account isn&apos;t registered as a platform admin. Ask an OWNER to grant you
          access.
        </div>
      </div>
    );
  }

  if (status.role === 'READONLY' && !status.mfaEnabled) {
    return (
      <div className="text-textColor p-[24px] max-w-[480px] mx-auto text-center">
        <div className="text-[18px] font-[600] mb-[8px]">Enter read-only admin panel</div>
        <div className="opacity-70 text-[13px] mb-[16px]">Read-only administrators may use the panel without MFA. You can enroll MFA from Security at any time.</div>
        <Button loading={busy} onClick={verify}>Enter</Button>
      </div>
    );
  }

  if (backupCodes) {
    return (
      <div className="text-textColor p-[24px] max-w-[480px] mx-auto">
        <div className="text-[18px] font-[600] mb-[8px]">Save your backup codes</div>
        <div className="opacity-70 text-[13px] mb-[12px]">
          Each code can be used once if you lose access to your authenticator. They will not be
          shown again.
        </div>
        <div className="grid grid-cols-2 gap-[8px] font-mono text-[13px] bg-sixth p-[12px] rounded mb-[16px]">
          {backupCodes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        <Button onClick={() => setBackupCodes(null)}>I&apos;ve saved them</Button>
      </div>
    );
  }

  if (!status.mfaEnabled) {
    if (!enrollment) {
      return (
        <div className="text-textColor p-[24px] max-w-[480px] mx-auto text-center">
          <div className="text-[18px] font-[600] mb-[8px]">Set up two-factor authentication</div>
          <div className="opacity-70 text-[14px] mb-[16px]">
            MFA is required before you can access the admin panel.
          </div>
          <Button onClick={startEnroll} loading={busy}>
            Start setup
          </Button>
        </div>
      );
    }
    return (
      <div className="text-textColor p-[24px] max-w-[480px] mx-auto">
        <div className="text-[18px] font-[600] mb-[8px]">Scan this QR code</div>
        <div className="opacity-70 text-[13px] mb-[12px]">
          Use an authenticator app (Google Authenticator, 1Password, Authy…), then enter the
          6-digit code below.
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qrDataUrl} alt="MFA QR code" className="mb-[12px] rounded" />
        <div className="text-[12px] opacity-60 mb-[16px] break-all">
          Manual key: {enrollment.secret}
        </div>
        <div className="flex gap-[8px]">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor flex-1"
          />
          <Button onClick={confirmEnroll} loading={busy} disabled={code.length !== 6}>
            Confirm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-textColor p-[24px] max-w-[480px] mx-auto text-center">
      <div className="text-[18px] font-[600] mb-[8px]">Enter your authenticator code</div>
      <div className="opacity-70 text-[13px] mb-[16px]">
        Admin sessions last 60 minutes and can be revoked at any time from Security &gt;
        Sessions.
      </div>
      <div className="flex gap-[8px]">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && verify()}
          placeholder="123456 or backup code"
          className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor flex-1"
        />
        <Button onClick={verify} loading={busy} disabled={!code}>
          Enter
        </Button>
      </div>
    </div>
  );
};
