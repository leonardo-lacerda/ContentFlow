import type { EmailCampaign, EmailBlock } from './email-campaigns.types';

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export const emailCampaignsApi = {
  async list(fetcher: Fetcher, type?: string): Promise<EmailCampaign[]> {
    const query = type ? `?type=${type}` : '';
    const res = await fetcher(`/email-campaigns${query}`);
    if (!res.ok) throw new Error('Erro ao listar campanhas');
    const data = await res.json();
    return Array.isArray(data) ? data : data?.items || [];
  },

  async listByBrand(fetcher: Fetcher, brandId: string): Promise<EmailCampaign[]> {
    const res = await fetcher(`/email-campaigns/brand/${brandId}`);
    if (!res.ok) throw new Error('Erro ao listar campanhas da marca');
    return res.json();
  },

  async getById(fetcher: Fetcher, id: string): Promise<EmailCampaign> {
    const res = await fetcher(`/email-campaigns/${id}`);
    if (!res.ok) throw new Error('Erro ao buscar campanha');
    return res.json();
  },

  async update(
    fetcher: Fetcher,
    id: string,
    data: {
      name?: string;
      subject?: string;
      preheader?: string;
      bodyJson?: { blocks: EmailBlock[] };
      primaryColor?: string;
      secondaryColor?: string;
      headerImageUrl?: string;
      logoUrl?: string;
      ctaText?: string;
      ctaUrl?: string;
      ctaColor?: string;
    }
  ): Promise<EmailCampaign> {
    const res = await fetcher(`/email-campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao salvar campanha');
    return res.json();
  },

  async reRender(fetcher: Fetcher, id: string, bodyJson?: { blocks: EmailBlock[] }): Promise<{ html: string }> {
    const res = await fetcher(`/email-campaigns/${id}/re-render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyJson ? { bodyJson } : {}),
    });
    if (!res.ok) throw new Error('Erro ao re-renderizar');
    return res.json();
  },

  async renderHtml(
    fetcher: Fetcher,
    data: { blocks: EmailBlock[]; subject?: string; primaryColor?: string; secondaryColor?: string; headerImageUrl?: string; logoUrl?: string }
  ): Promise<{ html: string }> {
    const res = await fetcher('/email-campaigns/render-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao renderizar HTML');
    return res.json();
  },

  async preview(fetcher: Fetcher, id: string): Promise<{ html: string }> {
    const res = await fetcher(`/email-campaigns/${id}/preview`);
    if (!res.ok) throw new Error('Erro ao carregar preview');
    return res.json();
  },

  async exportHtml(fetcher: Fetcher, id: string): Promise<{ html: string; filename: string }> {
    const res = await fetcher(`/email-campaigns/${id}/export`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao exportar');
    return res.json();
  },

  async delete(fetcher: Fetcher, id: string): Promise<void> {
    const res = await fetcher(`/email-campaigns/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir campanha');
  },

  async generate(
    fetcher: Fetcher,
    params: {
      brandProfileId: string;
      campaignType: string;
      name: string;
      templateId?: string;
      additionalContext?: string;
      contentIdeaId?: string;
      carouselProjectId?: string;
    }
  ): Promise<EmailCampaign> {
    const res = await fetcher('/email-campaigns/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.msg || 'Falha ao gerar campanha');
    }
    return res.json();
  },

  async generateWelcomeSequence(
    fetcher: Fetcher,
    params: {
      brandProfileId: string;
      sequenceLength: number;
      additionalContext?: string;
      contentIdeaId?: string;
      carouselProjectId?: string;
    }
  ): Promise<EmailCampaign[]> {
    const res = await fetcher('/email-campaigns/generate-welcome-sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.msg || 'Falha ao gerar sequência');
    }
    return res.json();
  },
};
