import { Metadata } from 'next';
import { IntegrationsGuideClient } from './integrations-guide.client';

export const metadata: Metadata = {
  title: 'ContentFlow - Como conectar sua conta',
  description:
    'Guia simples de como conectar o ContentFlow a outros programas e ferramentas de automação, sem precisar entender de programação.',
};

export default function IntegrationDocsPage() {
  return <IntegrationsGuideClient />;
}
