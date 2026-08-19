import { Metadata } from 'next';
import { McpGuideClient } from './mcp-guide.client';

export const metadata: Metadata = {
  title: 'ContentFlow - Conecte seu agente de IA via MCP',
  description:
    'Como conectar Claude Code, Cursor, Codex e outros clientes MCP à sua conta ContentFlow para agendar posts, gerar ideias e montar carrosséis.',
};

export default function McpDocsPage() {
  return <McpGuideClient />;
}
