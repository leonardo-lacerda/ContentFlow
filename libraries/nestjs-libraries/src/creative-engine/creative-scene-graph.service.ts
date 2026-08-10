import { BadRequestException, Injectable } from '@nestjs/common';

export type CreativeSceneGraphItem = {
  index?: number;
  videoUrl: string;
  audioUrl?: string;
  captionsUrl?: string;
  overlayText?: string;
  durationSec?: number;
};

@Injectable()
export class CreativeSceneGraphService {
  validate(input: { scenes?: CreativeSceneGraphItem[]; maxDurationSec?: number }) {
    if (!Array.isArray(input.scenes) || input.scenes.length < 1 || input.scenes.length > 60) {
      throw new BadRequestException('Scene graph must contain between 1 and 60 scenes');
    }
    const maxDuration = Math.min(180, Math.max(1, Number(input.maxDurationSec || 180)));
    let totalDurationSec = 0;
    const scenes = input.scenes.map((scene, position) => {
      if (!scene?.videoUrl?.trim()) throw new BadRequestException(`Scene ${position + 1} has no video URL`);
      const durationSec = scene.durationSec === undefined ? undefined : Number(scene.durationSec);
      if (durationSec !== undefined && (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 180)) {
        throw new BadRequestException(`Scene ${position + 1} has an invalid duration`);
      }
      if (durationSec) totalDurationSec += durationSec;
      return {
        ...scene,
        index: Number.isFinite(Number(scene.index)) ? Number(scene.index) : position,
        durationSec,
      };
    });
    if (totalDurationSec > maxDuration) throw new BadRequestException(`Scene graph exceeds the ${maxDuration}s duration limit`);
    return { scenes, totalDurationSec, maxDurationSec: maxDuration };
  }
}
