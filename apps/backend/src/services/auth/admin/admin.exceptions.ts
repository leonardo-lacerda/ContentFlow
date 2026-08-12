import { HttpException } from '@nestjs/common';

// Distinct from the regular-user HttpForbiddenException: an invalid/expired
// admin session must NOT clear the underlying user's regular `auth` cookie,
// it only means the elevated admin panel session is gone.
export class AdminSessionInvalidException extends HttpException {
  constructor() {
    super({ message: 'Admin session invalid or expired', code: 'ADMIN_SESSION_INVALID' }, 401);
  }
}

export class AdminPermissionDeniedException extends HttpException {
  constructor(permissionKey: string) {
    super({ message: 'Forbidden', code: 'ADMIN_PERMISSION_DENIED', permissionKey }, 403);
  }
}

export class AdminStepUpRequiredException extends HttpException {
  constructor() {
    super(
      { message: 'This action requires re-verifying your MFA code', code: 'ADMIN_STEP_UP_REQUIRED' },
      403
    );
  }
}

export class AdminReasonRequiredException extends HttpException {
  constructor() {
    super({ message: 'A reason is required for this action', code: 'ADMIN_REASON_REQUIRED' }, 400);
  }
}

export class AdminApprovalRequiredException extends HttpException {
  constructor() {
    super({ message: 'A second-admin approval is required for this action', code: 'ADMIN_APPROVAL_REQUIRED' }, 409);
  }
}

export class AdminIpNotAllowedException extends HttpException {
  constructor() {
    super({ message: 'Access from this IP is not allowed', code: 'ADMIN_IP_NOT_ALLOWED' }, 403);
  }
}
