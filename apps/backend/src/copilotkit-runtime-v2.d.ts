// @copilotkit/runtime publishes real types for its `/v2` subpath
// (dist/v2/index.d.mts), but this project's `moduleResolution: "node"`
// (tsconfig.base.json) can't resolve conditional package.json `exports`
// subpaths for type lookups — only Node's own runtime resolver (and the
// swc build) understands them, which is why this compiles and runs fine
// despite tsc needing this shim. Typed loosely on purpose: only the members
// copilot.controller.ts actually calls are declared.
declare module '@copilotkit/runtime/v2' {
  import type { Request, Response, NextFunction } from 'express';

  export class CopilotRuntime {
    constructor(options: { agents: Record<string, unknown> });
  }

  export function createCopilotEndpointExpress(options: {
    runtime: CopilotRuntime;
    basePath: string;
    mode?: 'single-route' | 'multi-route';
    cors?: boolean;
  }): (req: Request, res: Response, next: NextFunction) => void;
}
