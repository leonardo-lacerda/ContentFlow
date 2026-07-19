export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { VideoScriptsPage } from '@gitroom/frontend/components/social-posts/video-scripts-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Roteiro de vídeo',
  description: 'Roteiros de Reels/TikTok a partir de ideias e carrosséis',
};

export default async function VideoPage() {
  return <VideoScriptsPage />;
}
