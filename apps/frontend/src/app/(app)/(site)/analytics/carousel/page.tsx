export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { CarouselPerformanceDashboard } from '@gitroom/frontend/components/carousel-performance/carousel-performance-dashboard';

export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'
  } Performance de Carrosséis`,
  description: 'Analytics e performance dos seus carrosséis',
};

export default async function CarouselPerformancePage() {
  return <CarouselPerformanceDashboard />;
}
