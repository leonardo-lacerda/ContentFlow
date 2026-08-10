import { CreativeWebhookService } from './creative-webhook.service';

describe('CreativeWebhookService', () => {
  it.each([
    'http://127.0.0.1/hook',
    'https://localhost/hook',
    'https://192.168.1.20/hook',
  ])('rejects unsafe webhook destination %s', async (url) => {
    const service = new CreativeWebhookService({} as any);
    await expect(service.create('org-1', { url })).rejects.toThrow();
  });

  it('only replays a delivery inside the owning organization', async () => {
    const prisma = {
      creativeWebhookDelivery: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new CreativeWebhookService(prisma as any);

    await expect(service.replay('delivery-1', 'org-2')).rejects.toThrow('Creative webhook delivery not found');
    expect(prisma.creativeWebhookDelivery.findFirst).toHaveBeenCalledWith({
      where: { id: 'delivery-1', subscription: { organizationId: 'org-2' } },
      include: { subscription: true },
    });
  });

  it('replays the stored event through a fresh signed delivery record', async () => {
    const original = {
      id: 'delivery-1',
      event: 'creative.job.completed',
      payload: { data: { jobId: 'job-1' } },
      subscription: { id: 'subscription-1', organizationId: 'org-1' },
    };
    const replayed = { id: 'delivery-2', status: 'DELIVERED' };
    const prisma = {
      creativeWebhookDelivery: {
        findFirst: jest.fn().mockResolvedValue(original),
        findUnique: jest.fn().mockResolvedValue(replayed),
      },
    };
    const service = new CreativeWebhookService(prisma as any);
    jest.spyOn(service as any, 'deliver').mockResolvedValue('delivery-2');

    await expect(service.replay('delivery-1', 'org-1')).resolves.toEqual(replayed);
    expect((service as any).deliver).toHaveBeenCalledWith(
      original.subscription,
      original.event,
      original.payload,
    );
    expect(prisma.creativeWebhookDelivery.findUnique).toHaveBeenCalledWith({ where: { id: 'delivery-2' } });
  });
});
