'use client';

import { useEffect } from 'react';

interface ConversionTrackerProps {
  source: string;
  medium?: string;
  campaign?: string;
}

/**
 * Tracks page views and CTA clicks for SEO conversion measurement.
 * Sends events to PostHog/Plausible if available.
 */
export function ConversionTracker({ source, medium = 'seo', campaign }: ConversionTrackerProps) {
  useEffect(() => {
    // Track page view
    trackEvent('page_view', { source, medium, campaign });

    // Track CTA clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cta = target.closest('a[href="/auth"], a[href*="auth"]');
      if (cta) {
        trackEvent('cta_click', { source, medium, campaign, cta_text: cta.textContent?.trim() });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [source, medium, campaign]);

  return null;
}

function trackEvent(event: string, properties: Record<string, string | undefined>) {
  // PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, properties);
  }

  // Plausible
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(event, { props: properties });
  }


}
