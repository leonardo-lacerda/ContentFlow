'use client';

import { useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

type WorkflowNode = { nodeKey: string; type: string; config: Record<string, unknown> };
type WorkflowEdge = { sourceNode: string; targetNode: string };

const nodeTypes = ['input', 'generate.video', 'generate.image', 'generate.talking-actor', 'generate.lip-sync', 'generate.actor-replacement', 'generate.translate', 'generate.tts', 'tool.captions', 'tool.transcribe', 'tool.resize', 'tool.trim', 'tool.merge', 'tool.compose', 'tool.scene-render', 'output'];

export function CreativeWorkflowBuilder({ projectId }: { projectId?: string }) {
  const fetch = useFetch();
  const [name, setName] = useState('UGC performance pipeline');
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { nodeKey: 'brief', type: 'input', config: { key: 'prompt' } },
    { nodeKey: 'video', type: 'generate.video', config: { durationSec: 8, aspectRatio: '9:16' } },
    { nodeKey: 'captions', type: 'tool.captions', config: { from: 'video' } },
    { nodeKey: 'output', type: 'output', config: { from: 'captions' } },
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([
    { sourceNode: 'brief', targetNode: 'video' },
    { sourceNode: 'video', targetNode: 'captions' },
    { sourceNode: 'captions', targetNode: 'output' },
  ]);
  const [source, setSource] = useState('brief');
  const [target, setTarget] = useState('video');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [workflowId, setWorkflowId] = useState('');

  const readJson = async (path: string, options?: RequestInit) => {
    const response = await fetch(path, options);
    const body = await response.json();
    if (!response.ok) throw new Error(body?.message || 'Workflow request failed');
    return body;
  };

  const canConnect = useMemo(
    () => source && target && source !== target && !edges.some((edge) => edge.sourceNode === source && edge.targetNode === target),
    [source, target, edges],
  );

  const addNode = () => {
    const nodeKey = `node-${nodes.length + 1}`;
    setNodes((current) => [...current, { nodeKey, type: 'generate.video', config: { durationSec: 8, aspectRatio: '9:16' } }]);
    setTarget(nodeKey);
  };

  const connect = () => {
    if (canConnect) setEdges((current) => [...current, { sourceNode: source, targetNode: target }]);
  };

  const save = async () => {
    if (!projectId) return setMessage('Selecione um projeto antes de salvar o workflow.');
    setSaving(true);
    try {
      const workflow = await readJson('/creative/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name, nodes, edges, status: 'DRAFT' }),
      });
      setWorkflowId(workflow.id);
      setMessage(`Workflow salvo: ${workflow.id}`);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const quote = async () => {
    if (!workflowId) return setMessage('Salve o workflow antes de cotar.');
    try {
      const result = await readJson(`/creative/workflows/${workflowId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { prompt: 'Create a performance marketing ad' }, idempotencyKey: `ui-workflow:${workflowId}:${Date.now()}` }),
      });
      setMessage(`Quote: ${result.estimatedCredits} créditos em ${result.items?.length || 0} nodes.`);
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  const run = async () => {
    if (!workflowId) return setMessage('Salve o workflow antes de executar.');
    try {
      const result = await readJson(`/creative/workflows/${workflowId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Create a performance marketing ad' }),
      });
      setMessage(`Execução iniciada: ${result.id}`);
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Workflow visual</h2>
          <p className="mt-1 text-sm text-black/55">Monte o pipeline, conecte nodes e faça quote antes de executar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="button" onClick={addNode} className="rounded-xl border border-black/10 px-3 py-2 text-sm">+ Node</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar</button>
          <button type="button" onClick={quote} className="rounded-xl border border-blue-600 px-3 py-2 text-sm text-blue-600">Quote</button>
          <button type="button" onClick={run} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Executar</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {nodes.map((node, index) => (
          <div key={node.nodeKey} className="relative rounded-xl border border-black/10 bg-black/[0.03] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Node {index + 1}</div>
            <div className="mt-1 font-medium">{node.nodeKey}</div>
            <select className="mt-2 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs" value={node.type} onChange={(event) => setNodes((current) => current.map((item) => item.nodeKey === node.nodeKey ? { ...item, type: event.target.value } : item))}>
              {nodeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {index < nodes.length - 1 && <div className="pointer-events-none absolute -right-3 top-1/2 z-10 hidden text-black/30 md:block">→</div>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-black/15 p-3">
        <span className="text-xs font-medium text-black/60">Conectar</span>
        <select className="rounded-lg border border-black/10 px-2 py-1.5 text-xs" value={source} onChange={(event) => setSource(event.target.value)}>{nodes.map((node) => <option key={node.nodeKey}>{node.nodeKey}</option>)}</select>
        <span className="text-black/40">→</span>
        <select className="rounded-lg border border-black/10 px-2 py-1.5 text-xs" value={target} onChange={(event) => setTarget(event.target.value)}>{nodes.map((node) => <option key={node.nodeKey}>{node.nodeKey}</option>)}</select>
        <button type="button" onClick={connect} disabled={!canConnect} className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Adicionar aresta</button>
        <span className="text-xs text-black/45">{edges.length} arestas</span>
      </div>
      {message && <div className="mt-3 rounded-xl bg-yellow-50 px-3 py-2 text-xs">{message}</div>}
    </section>
  );
}
