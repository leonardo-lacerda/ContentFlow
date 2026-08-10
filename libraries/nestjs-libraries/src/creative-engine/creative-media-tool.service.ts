import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import {
  isSafePublicHttpsUrl,
} from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { readCreativeLocalUpload } from './creative-local-media';
import { CreativeSceneGraphItem, CreativeSceneGraphService } from './creative-scene-graph.service';

export type CreativeMediaTool =
  | 'captions'
  | 'transcribe'
  | 'resize'
  | 'trim'
  | 'merge'
  | 'compose'
  | 'scene-render';

export interface CreativeMediaToolResult {
  url?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

const MAX_MEDIA_BYTES = 512 * 1024 * 1024;

@Injectable()
export class CreativeMediaToolService {
  private readonly storage = UploadFactory.createStorage();

  constructor(private readonly sceneGraph?: CreativeSceneGraphService) {}

  async execute(
    tool: CreativeMediaTool,
    input: Record<string, any>,
  ): Promise<CreativeMediaToolResult> {
    if (tool === 'captions') return this.createCaptions(input.script || input.prompt, input.language, input.format);
    if (tool === 'transcribe') return this.transcribe(input.audioUrl, input.language);
    if (tool === 'resize') return this.resize(input.sourceUrl, input.aspectRatio || '9:16');
    if (tool === 'trim') return this.trim(input.sourceUrl, input.startSec || 0, input.durationSec);
    if (tool === 'merge') return this.merge(input.sourceUrls);
    if (tool === 'compose') return this.compose(input);
    if (tool === 'scene-render') return this.composeScenes(input);
    throw new BadRequestException(`Unsupported creative media tool: ${tool}`);
  }

  async createCaptions(text: string, language = 'pt-BR', format: 'srt' | 'vtt' = 'srt'): Promise<CreativeMediaToolResult> {
    const normalized = String(text || '').trim();
    if (!normalized) throw new BadRequestException('Script text is required to create captions');
    const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const cues = lines.map((line, index) => {
      const start = index * 4;
      const end = start + 4;
      const stamp = (seconds: number) => `00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')},000`;
      return `${index + 1}\n${stamp(start)} --> ${stamp(end)}\n${line}\n`;
    }).join('\n');
    const isVtt = format === 'vtt';
    const content = isVtt ? `WEBVTT\n\n${cues.replace(/,000/g, '.000')}` : cues;
    const mimeType = isVtt ? 'text/vtt' : 'application/x-subrip';
    const uploaded = await this.upload(Buffer.from(content, 'utf8'), mimeType, `creative-${Date.now()}.${isVtt ? 'vtt' : 'srt'}`);
    return {
      url: uploaded.url,
      mimeType,
      metadata: { format: isVtt ? 'vtt' : 'srt', language, cueCount: lines.length },
    };
  }

  async transcribe(audioUrl: string, language?: string): Promise<CreativeMediaToolResult> {
    const audio = await this.download(audioUrl);
    if (!process.env.OPENAI_API_KEY) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is required for transcription');
    }
    const form = new FormData();
    form.append('file', new Blob([audio.buffer], { type: audio.contentType }), basename(new URL(audioUrl).pathname) || 'audio.mp3');
    form.append('model', process.env.CREATIVE_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');
    if (language) form.append('language', language.split('-')[0]);
    form.append('response_format', 'verbose_json');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!response.ok) {
      throw new Error(`OpenAI transcription failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
    }
    const result = await response.json() as any;
    return {
      metadata: {
        text: result?.text || '',
        language: result?.language || language,
        duration: result?.duration,
        segments: result?.segments || [],
      },
    };
  }

  async resize(sourceUrl: string, aspectRatio: string): Promise<CreativeMediaToolResult> {
    const dimensions: Record<string, [number, number]> = {
      '9:16': [1080, 1920],
      '1:1': [1080, 1080],
      '16:9': [1920, 1080],
      '4:5': [1080, 1350],
    };
    const [width, height] = dimensions[aspectRatio] || dimensions['9:16'];
    return this.runFfmpeg(sourceUrl, [
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    ], `resize-${aspectRatio.replace(':', '-')}.mp4`, { aspectRatio, width, height });
  }

  async trim(sourceUrl: string, startSec: number, durationSec?: number): Promise<CreativeMediaToolResult> {
    const args = ['-ss', String(Math.max(0, Number(startSec) || 0))];
    if (durationSec !== undefined) args.push('-t', String(Math.max(0.1, Number(durationSec))));
    args.push('-c:v', 'libx264', '-c:a', 'aac');
    return this.runFfmpeg(sourceUrl, args, `trim-${Date.now()}.mp4`, { startSec, durationSec });
  }

  async merge(sourceUrls: string[]): Promise<CreativeMediaToolResult> {
    if (!Array.isArray(sourceUrls) || sourceUrls.length < 2 || sourceUrls.length > 20) {
      throw new BadRequestException('Merge requires between 2 and 20 source videos');
    }
    return this.runFfmpeg(sourceUrls[0], ['-c:v', 'libx264', '-c:a', 'aac'], `merge-${Date.now()}.mp4`, { sourceCount: sourceUrls.length }, sourceUrls);
  }

  async compose(input: Record<string, any>): Promise<CreativeMediaToolResult> {
    const sourceUrl = input.sourceUrl;
    const localSource = sourceUrl ? await readCreativeLocalUpload(sourceUrl) : null;
    if (!sourceUrl || (!localSource && !(await isSafePublicHttpsUrl(sourceUrl)))) {
      throw new BadRequestException('Composition requires a public HTTPS source video');
    }
    const workingDirectory = await mkdtemp(join(tmpdir(), 'contentflow-creative-compose-'));
    try {
      const video = await this.download(sourceUrl);
      const videoPath = join(workingDirectory, 'video.mp4');
      await writeFile(videoPath, video.buffer);
      const inputPaths = [videoPath];
      const ffmpegInputs = ['-i', videoPath];
      let audioIndex: number | undefined;
      let watermarkIndex: number | undefined;
      if (input.audioUrl) {
        const audio = await this.download(input.audioUrl);
        const audioPath = join(workingDirectory, 'audio.bin');
        await writeFile(audioPath, audio.buffer);
        audioIndex = inputPaths.length;
        inputPaths.push(audioPath);
        ffmpegInputs.push('-i', audioPath);
      }
      if (input.watermarkUrl) {
        const watermark = await this.download(input.watermarkUrl);
        const watermarkPath = join(workingDirectory, 'watermark.bin');
        await writeFile(watermarkPath, watermark.buffer);
        watermarkIndex = inputPaths.length;
        inputPaths.push(watermarkPath);
        ffmpegInputs.push('-i', watermarkPath);
      }
      const filterParts: string[] = [];
      let currentVideo = '[0:v]';
      let filterIndex = 0;
      if (input.captionsUrl) {
        const captions = await this.download(input.captionsUrl);
        const captionsPath = join(workingDirectory, 'captions.srt');
        await writeFile(captionsPath, captions.buffer);
        const escaped = this.escapeFilterPath(captionsPath);
        const next = `[v${filterIndex++}]`;
        filterParts.push(`${currentVideo}subtitles='${escaped}'${next}`);
        currentVideo = next;
      }
      if (input.overlayText) {
        const textPath = join(workingDirectory, 'overlay.txt');
        await writeFile(textPath, String(input.overlayText), 'utf8');
        const escaped = this.escapeFilterPath(textPath);
        const font = process.env.CREATIVE_FFMPEG_FONT_PATH
          ? `fontfile='${this.escapeFilterPath(process.env.CREATIVE_FFMPEG_FONT_PATH)}':`
          : '';
        const next = `[v${filterIndex++}]`;
        filterParts.push(`${currentVideo}drawtext=${font}textfile='${escaped}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.55:x=(w-text_w)/2:y=h-160${next}`);
        currentVideo = next;
      }
      if (watermarkIndex !== undefined) {
        const next = `[v${filterIndex++}]`;
        filterParts.push(`${currentVideo}[${watermarkIndex}:v]overlay=W-w-24:H-h-24${next}`);
        currentVideo = next;
      }
      const outputPath = join(workingDirectory, 'composed.mp4');
      const args = ['-y', ...ffmpegInputs];
      if (filterParts.length) args.push('-filter_complex', `${filterParts.join(';')};${currentVideo}null[vout]`, '-map', '[vout]');
      else args.push('-map', '0:v:0');
      if (audioIndex !== undefined) args.push('-map', `${audioIndex}:a:0`);
      else args.push('-map', '0:a?');
      args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-movflags', '+faststart', outputPath);
      await this.spawnFfmpeg(args);
      const buffer = await readFile(outputPath);
      const uploaded = await this.upload(buffer, 'video/mp4', `compose-${Date.now()}.mp4`);
      return {
        url: uploaded.url,
        mimeType: 'video/mp4',
        metadata: {
          composed: true,
          captions: Boolean(input.captionsUrl),
          audio: Boolean(input.audioUrl),
          watermark: Boolean(input.watermarkUrl),
          overlayText: Boolean(input.overlayText),
        },
      };
    } finally {
      await rm(workingDirectory, { recursive: true, force: true });
    }
  }

  async composeScenes(input: { scenes?: CreativeSceneGraphItem[]; maxDurationSec?: number }): Promise<CreativeMediaToolResult> {
    const graph = (this.sceneGraph || new CreativeSceneGraphService()).validate(input);
    const rendered: string[] = [];
    for (const scene of graph.scenes) {
      let sourceUrl = scene.videoUrl;
      if (scene.durationSec) {
        const trimmed = await this.trim(sourceUrl, 0, scene.durationSec);
        if (!trimmed.url) throw new BadRequestException(`Scene ${scene.index} trim returned no output`);
        sourceUrl = trimmed.url;
      }
      const composed = await this.compose({
        sourceUrl,
        audioUrl: scene.audioUrl,
        captionsUrl: scene.captionsUrl,
        overlayText: scene.overlayText,
      });
      if (!composed.url) throw new BadRequestException(`Scene ${scene.index} composition returned no output`);
      rendered.push(composed.url);
    }
    if (rendered.length === 1) return { url: rendered[0], mimeType: 'video/mp4', metadata: { sceneCount: 1, totalDurationSec: graph.totalDurationSec } };
    const merged = await this.merge(rendered);
    return { ...merged, metadata: { ...(merged.metadata || {}), sceneCount: rendered.length, totalDurationSec: graph.totalDurationSec } };
  }

  private async runFfmpeg(
    sourceUrl: string,
    args: string[],
    outputName: string,
    metadata: Record<string, unknown>,
    sourceUrls?: string[],
  ): Promise<CreativeMediaToolResult> {
    const workingDirectory = await mkdtemp(join(tmpdir(), 'contentflow-creative-'));
    try {
      const urls = sourceUrls || [sourceUrl];
      const inputPaths: string[] = [];
      for (let index = 0; index < urls.length; index += 1) {
        const downloaded = await this.download(urls[index]);
        const inputPath = join(workingDirectory, `input-${index}.mp4`);
        await writeFile(inputPath, downloaded.buffer);
        inputPaths.push(inputPath);
      }
      const outputPath = join(workingDirectory, outputName);
      const commandArgs = ['-y'];
      if (sourceUrls) {
        const concatPath = join(workingDirectory, 'concat.txt');
        const concat = inputPaths.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join('\n');
        await writeFile(concatPath, concat, 'utf8');
        commandArgs.push('-f', 'concat', '-safe', '0', '-i', concatPath);
      } else {
        commandArgs.push('-i', inputPaths[0]);
      }
      commandArgs.push(...args, '-movflags', '+faststart', outputPath);
      await this.spawnFfmpeg(commandArgs);
      const buffer = await readFile(outputPath);
      const uploaded = await this.upload(buffer, 'video/mp4', outputName);
      return { url: uploaded.url, mimeType: 'video/mp4', metadata };
    } finally {
      await rm(workingDirectory, { recursive: true, force: true });
    }
  }

  private async download(url: string) {
    const local = await readCreativeLocalUpload(url);
    if (local) return local;
    if (!url || !(await isSafePublicHttpsUrl(url))) {
      throw new BadRequestException('Media source must be a public HTTPS URL');
    }
    const response = await fetch(url, {
      // @ts-expect-error undici dispatcher is supported by the runtime fetch implementation.
      dispatcher: ssrfSafeDispatcher,
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`Unable to download media (${response.status})`);
    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_MEDIA_BYTES) throw new BadRequestException('Media input is too large');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_MEDIA_BYTES) throw new BadRequestException('Media input is too large');
    return { buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
  }

  private async upload(buffer: Buffer, mimetype: string, filename: string) {
    const uploaded = await this.storage.uploadFile({
      buffer,
      mimetype,
      size: buffer.length,
      path: '',
      fieldname: 'creative-tool',
      destination: '',
      stream: Readable.from(buffer),
      filename,
      originalname: filename,
      encoding: '7bit',
    });
    return { url: String(uploaded.path || '') };
  }

  private spawnFfmpeg(args: string[]) {
    return new Promise<void>((resolve, reject) => {
      const command = process.env.CREATIVE_FFMPEG_PATH || 'ffmpeg';
      const child = spawn(command, args, { windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr = `${stderr}${chunk}`.slice(-8000);
      });
      child.on('error', (error) => reject(new ServiceUnavailableException(`FFmpeg is unavailable: ${error.message}`)));
      child.on('close', (code) => {
        if (code === 0) return resolve();
        reject(new Error(`FFmpeg failed (${code}): ${stderr}`));
      });
    });
  }

  private escapeFilterPath(value: string) {
    return value.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  }
}
