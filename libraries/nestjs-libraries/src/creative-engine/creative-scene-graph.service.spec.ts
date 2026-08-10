import { CreativeSceneGraphService } from './creative-scene-graph.service';

describe('CreativeSceneGraphService', () => {
  const service = new CreativeSceneGraphService();

  it('normalizes scene indexes and enforces the total duration', () => {
    expect(service.validate({
      maxDurationSec: 12,
      scenes: [
        { videoUrl: 'https://cdn.example/one.mp4', durationSec: 4 },
        { index: 8, videoUrl: 'https://cdn.example/two.mp4', durationSec: 5 },
      ],
    })).toMatchObject({
      totalDurationSec: 9,
      scenes: [{ index: 0 }, { index: 8 }],
    });
  });

  it('rejects empty, malformed and overlong graphs', () => {
    expect(() => service.validate({ scenes: [] })).toThrow();
    expect(() => service.validate({ scenes: [{ videoUrl: '' }] })).toThrow();
    expect(() => service.validate({ maxDurationSec: 5, scenes: [{ videoUrl: 'https://cdn.example/one.mp4', durationSec: 6 }] })).toThrow();
  });
});
