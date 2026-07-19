import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

type PlaywrightModule = typeof import('playwright');
type Browser = import('playwright').Browser;

export type RenderHtmlInput = {
  html: string;
  width: number;
  height: number;
  /** deviceScaleFactor, default 2 */
  scale?: number;
};

@Injectable()
export class PlaywrightRenderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightRenderService.name);
  private browser: Browser | null = null;
  private playwright: PlaywrightModule | null = null;
  private launchPromise: Promise<Browser> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private readonly concurrency: number;
  private active = 0;

  constructor() {
    this.concurrency = Math.max(
      1,
      Number(process.env.DESIGN_SYSTEM_RENDER_CONCURRENCY || 1)
    );
  }

  async onModuleInit() {
    if (process.env.DESIGN_SYSTEM_LAZY_BROWSER === '1') {
      return;
    }
    // Warm browser in background; don't block boot if Chromium missing.
    void this.ensureBrowser().catch((err) => {
      this.logger.warn(
        `Playwright browser not ready at boot: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    });
  }

  async onModuleDestroy() {
    await this.close();
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        /* ignore */
      }
      this.browser = null;
    }
    this.launchPromise = null;
  }

  /**
   * Render HTML string to PNG buffer at exact CSS pixels * scale.
   */
  async renderHtmlToPng(input: RenderHtmlInput): Promise<Buffer> {
    return this.withSlot(() => this.renderOnce(input));
  }

  private async withSlot<T>(fn: () => Promise<T>): Promise<T> {
    // Simple mutex queue that still allows limited concurrency.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prev = this.queue;
    this.queue = prev.then(() => gate);
    await prev;

    while (this.active >= this.concurrency) {
      await new Promise((r) => setTimeout(r, 25));
    }
    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
      release();
    }
  }

  private async renderOnce(input: RenderHtmlInput): Promise<Buffer> {
    const width = Math.max(1, Math.round(input.width));
    const height = Math.max(1, Math.round(input.height));
    const scale = Math.max(1, Number(input.scale || 2));

    const browser = await this.ensureBrowser();
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: scale,
    });
    const page = await context.newPage();
    try {
      await page.setContent(input.html, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fonts = (document as any).fonts;
        if (fonts?.ready) {
          await fonts.ready;
        }
      });
      // Extra beat for late webfont paint
      await page.waitForTimeout(80);
      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
        omitBackground: false,
      });
      return Buffer.from(buffer);
    } finally {
      await context.close().catch(() => undefined);
    }
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }
    if (this.launchPromise) {
      return this.launchPromise;
    }

    this.launchPromise = (async () => {
      const pw = await this.loadPlaywright();
      try {
        const browser = await pw.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        this.browser = browser;
        this.logger.log('Playwright Chromium launched for design-system render');
        return browser;
      } catch (err) {
        // Attempt to install chromium once
        this.logger.warn(
          `Chromium launch failed, attempting install: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        await this.installChromium();
        const browser = await pw.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        this.browser = browser;
        return browser;
      }
    })();

    try {
      return await this.launchPromise;
    } catch (err) {
      this.launchPromise = null;
      throw err;
    }
  }

  private async loadPlaywright(): Promise<PlaywrightModule> {
    if (this.playwright) {
      return this.playwright;
    }
    try {
      // Dynamic import so backend can boot if dep is still installing.
      this.playwright = await import('playwright');
      return this.playwright;
    } catch {
      throw new Error(
        'playwright package is not installed. Run: pnpm add playwright && pnpm exec playwright install chromium'
      );
    }
  }

  private async installChromium() {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['playwright', 'install', 'chromium'],
        { timeout: 300_000 }
      );
    } catch (err) {
      this.logger.error(
        `playwright install chromium failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
