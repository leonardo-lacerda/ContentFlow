import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';

export const dynamic = 'force-dynamic';
import '../global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import '@copilotkit/react-ui/styles.css';
import LayoutContext from '@gitroom/frontend/components/layout/layout.context';
import { ReactNode } from 'react';
import { Inter, Fraunces } from 'next/font/google';
import clsx from 'clsx';
import { VariableContextComponent } from '@gitroom/react/helpers/variable.context';
import UtmSaver from '@gitroom/helpers/utils/utm.saver';

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-cf-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-cf-serif',
  display: 'swap',
});

export default async function AppLayout({ children }: { children: ReactNode }) {
  const billingEnabled = !!(
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.CAKTO_STARTER_CHECKOUT_URL ||
    process.env.CAKTO_PRO_CHECKOUT_URL ||
    process.env.CAKTO_SCALE_CHECKOUT_URL ||
    process.env.CAKTO_CUSTOMER_PORTAL_URL
  );

  return (
    <html>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          href="https://cdn.jsdelivr.net/fontsource/css/anton@latest/index.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/fontsource/css/schibsted-grotesk@latest/index.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/fontsource/css/space-mono@latest/index.css"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/landing-styles.css" />
      </head>
      <body
        className={clsx(
          inter.className,
          inter.variable,
          fraunces.variable,
          'light text-primary !bg-primary font-sans'
        )}
      >
        <VariableContextComponent
          language="en"
          storageProvider={
            process.env.STORAGE_PROVIDER! as 'local' | 'cloudflare'
          }
          stripeClient=""
          environment={process.env.NODE_ENV!}
          backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL!}
          plontoKey={process.env.NEXT_PUBLIC_POLOTNO!}
          billingEnabled={billingEnabled}
          discordUrl={process.env.NEXT_PUBLIC_DISCORD_SUPPORT!}
          frontEndUrl={process.env.FRONTEND_URL!}
          isGeneral={!!process.env.IS_GENERAL}
          genericOauth={!!process.env.CONTENTFLOW_GENERIC_OAUTH}
          oauthLogoUrl={process.env.NEXT_PUBLIC_CONTENTFLOW_OAUTH_LOGO_URL!}
          oauthDisplayName={process.env.NEXT_PUBLIC_CONTENTFLOW_OAUTH_DISPLAY_NAME!}
          uploadDirectory={process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY!}
          cloudflareUrl={process.env.CLOUDFLARE_BUCKET_URL || ''}
          mainUrl={process.env.MAIN_URL || ''}
          mcpUrl={process.env.MCP_URL}
          dub={false}
          facebookPixel={process.env.NEXT_PUBLIC_FACEBOOK_PIXEL!}
          telegramBotName={process.env.TELEGRAM_BOT_NAME!}
          neynarClientId={process.env.NEYNAR_CLIENT_ID!}
          isSecured={!process.env.NOT_SECURED}
          disableImageCompression={!!process.env.DISABLE_IMAGE_COMPRESSION}
          disableXAnalytics={!!process.env.DISABLE_X_ANALYTICS}
          sentryDsn={process.env.NEXT_PUBLIC_SENTRY_DSN!}
          extensionId={process.env.EXTENSION_ID || ''}
          transloadit={
            process.env.TRANSLOADIT_AUTH && process.env.TRANSLOADIT_TEMPLATE
              ? [
                  process.env.TRANSLOADIT_AUTH!,
                  process.env.TRANSLOADIT_TEMPLATE!,
                ]
              : []
          }
        >
          <MantineWrapper>
            <LayoutContext>
              <UtmSaver />
              {children}
            </LayoutContext>
          </MantineWrapper>
        </VariableContextComponent>
      </body>
    </html>
  );
}
