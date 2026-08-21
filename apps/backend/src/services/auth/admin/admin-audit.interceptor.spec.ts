import { of } from 'rxjs';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

// Regression test found during offensive re-validation of the 2026-08-20
// audit's admin IP-spoofing fix (admin-request.utils.ts): this interceptor
// had the exact same bug — it preferred the raw `x-forwarded-for` header
// (client-controlled; nginx APPENDS to it rather than replacing it) over
// `request.ip` (Express's own trust-proxy-aware resolution) when recording
// the IP on every admin audit log entry. A forged header could corrupt the
// one record an incident response would rely on to know where an admin
// action actually came from.
describe('AdminAuditInterceptor — audit log IP is not spoofable', () => {
  const buildInterceptor = () => {
    const writeSpy = jest.fn().mockResolvedValue(undefined);
    const adminAuditService = { write: writeSpy };
    const adminAlertService = { observeAdminAction: jest.fn().mockResolvedValue(undefined) };
    const reflector = { get: () => ({ key: 'users.write.basic', severity: 'WARNING', requireReason: false }) };
    const interceptor = new AdminAuditInterceptor(
      reflector as any,
      adminAuditService as any,
      adminAlertService as any
    );
    return { interceptor, writeSpy };
  };

  it('records request.ip, ignoring a forged x-forwarded-for header entirely', async () => {
    const { interceptor, writeSpy } = buildInterceptor();
    const request: any = {
      path: '/admin/users/target-id',
      method: 'PATCH',
      params: { id: 'target-id' },
      body: {},
      headers: { 'x-forwarded-for': '10.0.0.1', 'user-agent': 'jest' },
      ip: '198.51.100.7', // the real, Express-resolved client IP
      adminUser: { id: 'admin-1', user: { email: 'admin@example.com' } },
      res: { setHeader: jest.fn() },
    };
    const context: any = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
    };
    const next = { handle: () => of({ ok: true }) };

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, next as any).subscribe(() => resolve());
    });
    // write() runs fire-and-forget inside tap(); flush microtasks.
    await new Promise((resolve) => setImmediate(resolve));

    expect(writeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '198.51.100.7' })
    );
  });
});
