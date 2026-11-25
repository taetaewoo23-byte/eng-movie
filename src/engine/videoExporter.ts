import { Beat, BeatAudio, SceneConfig } from '../types';
import { buildSubtitleChunksForBeat } from '../utils/textHelpers';
import { renderAnimationFrame } from './canvasRenderer';

export interface ExportVideoParams {
  beats: Beat[];
  beatAudios: BeatAudio[];
  sceneConfig: SceneConfig;
  onProgress: (percent: number, label: string) => void;
}

export interface ExportedVideoResult {
  blob: Blob;
  extension: 'mp4' | 'webm';
}

function pickSupportedMimeType(): { mimeType: string; extension: 'mp4' | 'webm' } {
  const candidates: Array<{ mimeType: string; extension: 'mp4' | 'webm' }> = [
    { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', extension: 'webm' };
}

async function decodeAudioUrl(ctx: AudioContext, dataUrl: string): Promise<AudioBuffer> {
  const res = await fetch(dataUrl);
  const arrayBuffer = await res.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

/**
 * Renders the complete 30-second animated film with synchronized English TTS audio
 * and burned-in English subtitles via HTML5 Canvas + MediaRecorder.
 */
export async function exportCompositeVideo({
  beats,
  beatAudios,
  sceneConfig,
  onProgress,
}: ExportVideoParams): Promise<ExportedVideoResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video recording is not supported in this browser.');
  }

  const width = 1280;
  const height = 720;
  const totalDurationSec = 30;
  const fps = 30;

  onProgress(2, 'Preparing audio tracks...');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize canvas rendering context.');
  }

  const audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  const dest = audioCtx.createMediaStreamDestination();

  // Decode all beat WAV files
  const decodedBuffers: Array<{ beat: Beat; buffer: AudioBuffer | null }> = [];
  for (const beat of beats) {
    const audioEntry = beatAudios.find((a) => a.beatIndex === beat.index);
    if (audioEntry?.audioDataUrl) {
      const buffer = await decodeAudioUrl(audioCtx, audioEntry.audioDataUrl);
      decodedBuffers.push({ beat, buffer });
    } else {
      decodedBuffers.push({ beat, buffer: null });
    }
  }

  // Precompute word-for-word subtitle chunks aligned to each beat's real voice duration
  const beatAudioDurations = beats.map((beat, idx) => {
    const buf = decodedBuffers[idx]?.buffer;
    const beatLen = beat.endSec - beat.startSec;
    return buf ? Math.min(beatLen - 0.15, buf.duration) : beatLen - 0.5;
  });

  const subtitleChunksByBeat = beats.map((beat, idx) => {
    const voiceDur = beatAudioDurations[idx];
    const startOffset = beat.startSec + 0.15;
    const endOffset = Math.min(beat.endSec - 0.1, startOffset + voiceDur);
    return buildSubtitleChunksForBeat(beat.englishLines, startOffset, endOffset);
  });

  const { mimeType, extension } = pickSupportedMimeType();
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: 3_500_000,
    ...(mimeType ? { mimeType } : {}),
  };

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const recordingFinished = new Promise<ExportedVideoResult>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, {
        type: mimeType || 'video/webm',
      });
      resolve({ blob, extension });
    };
    recorder.onerror = () => {
      reject(new Error('Failed while recording the 30-second video.'));
    };
  });

  // Schedule all 4 beat audio clips cleanly onto the audio stream timeline
  const startAudioTime = audioCtx.currentTime + 0.15;
  decodedBuffers.forEach(({ beat, buffer }) => {
    if (!buffer) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    // Slight rate adjust ONLY if TTS slightly exceeds the beat window (never rush unless needed)
    const maxWindow = beat.endSec - beat.startSec - 0.2;
    if (buffer.duration > maxWindow && maxWindow > 1) {
      source.playbackRate.value = Math.min(1.25, buffer.duration / maxWindow);
    }
    source.connect(dest);
    source.start(startAudioTime + beat.startSec + 0.15);
  });

  recorder.start(250);

  const startPerf = performance.now();

  await new Promise<void>((resolve) => {
    const intervalId = window.setInterval(() => {
      const elapsedSec = (performance.now() - startPerf) / 1000;
      const clampedSec = Math.min(totalDurationSec, elapsedSec);

      renderAnimationFrame({
        ctx,
        width,
        height,
        timeSec: clampedSec,
        beats,
        sceneConfig,
        beatAudioDurations,
        showEndCredit: true,
        subtitleChunksByBeat,
      });

      const pct = Math.min(99, Math.round((clampedSec / totalDurationSec) * 100));
      onProgress(pct, `Rendering video (${Math.floor(clampedSec)}s / 30s)...`);

      if (elapsedSec >= totalDurationSec) {
        window.clearInterval(intervalId);
        resolve();
      }
    }, 1000 / fps);
  });

  recorder.stop();
  const result = await recordingFinished;

  combinedStream.getTracks().forEach((t) => t.stop());
  await audioCtx.close();

  onProgress(100, 'Ready!');
  return result;
}
