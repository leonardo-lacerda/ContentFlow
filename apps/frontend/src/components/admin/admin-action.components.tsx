'use client';

import React, { useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useAdminFetch, AdminStepUpRequiredError } from '@gitroom/frontend/components/admin/admin-api.hooks';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const AdminReasonField = (props: { value: string; onChange: (value: string) => void; placeholder?: string }) => (
  <label className="flex flex-col gap-[6px] text-[13px]">
    <span>Reason (required)</span>
    <textarea value={props.value} onChange={(event) => props.onChange(event.target.value)} placeholder={props.placeholder || 'Add an operational reason or ticket reference'} rows={3} className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[10px] py-[8px] text-textColor" />
  </label>
);

export const AdminStepUpModal = (props: { onClose: () => void; onVerified: () => void }) => {
  const adminFetch = useAdminFetch();
  const toaster = useToaster();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    setBusy(true);
    try {
      const response = await adminFetch('/admin/auth/step-up', { method: 'POST', body: JSON.stringify({ code }) });
      if (!response.ok) throw new Error('Invalid MFA code');
      props.onVerified();
    } catch (error) {
      toaster.show(error instanceof Error ? error.message : 'Unable to verify MFA', 'warning');
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-[20px]">
      <div className="bg-newBgColorInner border border-newTableBorder rounded-[10px] p-[20px] w-full max-w-[420px] flex flex-col gap-[12px]">
        <div className="text-[18px] font-[600]">Confirm sensitive action</div>
        <div className="text-[13px] opacity-70">Enter your authenticator code. This confirmation remains valid for five minutes.</div>
        <input autoFocus value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456 or backup code" className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[10px] h-[38px] text-textColor" />
        <div className="flex justify-end gap-[8px]"><Button secondary onClick={props.onClose}>Cancel</Button><Button loading={busy} disabled={!code} onClick={verify}>Confirm</Button></div>
      </div>
    </div>
  );
};

export async function executeAdminAction(adminFetch: ReturnType<typeof useAdminFetch>, url: string, body: Record<string, unknown>) {
  const response = await adminFetch(url, { method: 'POST', body: JSON.stringify(body) });
  if (response.ok) return { ok: true };
  if (response.status === 403) {
    let code = '';
    try { code = (await response.clone().json()).code || ''; } catch { /* ignore */ }
    if (code === 'ADMIN_STEP_UP_REQUIRED') throw new AdminStepUpRequiredError();
  }
  throw new Error((await response.json().catch(() => ({})))?.message || 'Action failed');
}
