import type { VideoProject, VideoScriptData } from './video-scripts.types';

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export const videoScriptsApi = {
  async listByBrand(fetcher: Fetcher, brandId: string): Promise<VideoProject[]> {
    const res = await fetcher(`/video-scripts/brand/${brandId}`);
    if (!res.ok) throw new Error('Erro ao listar roteiros');
    return res.json();
  },

  async getById(fetcher: Fetcher, id: string): Promise<VideoProject> {
    const res = await fetcher(`/video-scripts/${id}`);
    if (!res.ok) throw new Error('Erro ao buscar roteiro');
    return res.json();
  },

  async updateProject(
    fetcher: Fetcher,
    id: string,
    data: {
      name?: string;
      script?: VideoScriptData;
      totalDurationSec?: number;
      status?: string;
      format?: string;
    }
  ): Promise<VideoProject> {
    const res = await fetcher(`/video-scripts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao salvar roteiro');
    return res.json();
  },

  async deleteProject(fetcher: Fetcher, id: string): Promise<void> {
    const res = await fetcher(`/video-scripts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir roteiro');
  },

  async generateScript(
    fetcher: Fetcher,
    params: {
      brandProfileId: string;
      carouselProjectId?: string;
      contentIdeaId?: string;
      name?: string;
      format?: string;
      maxDuration?: number;
      additionalContext?: string;
    }
  ): Promise<{ script: VideoScriptData; costEstimate: number; id: string }> {
    const res = await fetcher('/video-scripts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.msg || 'Falha ao gerar roteiro');
    }
    return res.json();
  },

  async regenerateScript(
    fetcher: Fetcher,
    id: string,
    opts: { language?: string; targetDurationSec?: number; style?: string } = {}
  ): Promise<{ script: VideoScriptData; costEstimate: number }> {
    const res = await fetcher(`/video-scripts/${id}/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.msg || 'Falha ao regenerar roteiro');
    }
    return res.json();
  },
};
