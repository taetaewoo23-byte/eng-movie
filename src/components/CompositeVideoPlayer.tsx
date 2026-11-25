import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Beat, BeatAudio, SceneConfig } from '../types';
import { buildSubtitleChunksForBeat } from '../utils/textHelpers';
import { renderAnimationFrame } from '../engine/canvasRenderer';

interface CompositeVideoPlayerProps {
  beats: Beat[];
  beatAudios: BeatAudio[];
  sceneConfig: SceneConfig;
  showEndCredit?: boolean;
  onBeatChange?: (beatIndex: number) => void;
  externalSeekSec?: number | null;
  onClearExternalSeek?: () => void;
}

export function CompositeVideoPlayer({
  beats,
  beatAudios,
  sceneConfig,
  showEndCredit = false,
  onBeatChange,
  externalSeekSec,
  onClearExternalSeek,
}: CompositeVideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const currentTimeRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const activeAudioBeatRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);

  const totalDuration = 30;

  const beatAudioDurations = useMemo(
    () =>
      beats.map((b) => {
        const found = beatAudios.find((a) => a.beatIndex === b.index);
        const maxWin = b.endSec - b.startSec - 0.15;
        return found ? Math.min(maxWin, found.durationSec) : maxWin - 0.3;
      }),
    [beats, beatAudios]
  );

  const subtitleChunksByBeat = useMemo(
    () =>
      beats.map((beat, idx) => {
        const voiceDur = beatAudioDurations[idx];
        const startOffset = beat.startSec + 0.15;
        const endOffset = Math.min(beat.endSec - 0.1, startOffset + voiceDur);
        return buildSubtitleChunksForBeat(beat.englishLines, startOffset, endOffset);
      }),
    [beats, beatAudioDurations]
  );

  const getBeatIndexAtTime = useCallback(
    (t: number) => {
      for (let i = 0; i < beats.length; i++) {
        if (t >= beats[i].startSec && t < beats[i].endSec) return i;
      }
      return Math.max(0, beats.length - 1);
    },
    [beats]
  );

  const syncAudioToTime = useCallback(
    (t: number, shouldPlay: boolean) => {
      const audioEl = audioRef.current;
      if (!audioEl) return;

      const bIdx = getBeatIndexAtTime(t);
      const beat = beats[bIdx];
      const entry = beatAudios.find((a) => a.beatIndex === beat.index);
      const localOffset = t - (beat.startSec + 0.15);

      if (!entry?.audioDataUrl) {
        audioEl.pause();
        activeAudioBeatRef.current = -1;
        return;
      }

      const maxWin = beat.endSec - beat.startSec - 0.2;
      const neededRate =
        entry.durationSec > maxWin && maxWin > 1
          ? Math.min(1.25, entry.durationSec / maxWin)
          : 1.0;

      if (activeAudioBeatRef.current !== bIdx) {
        activeAudioBeatRef.current = bIdx;
        audioEl.src = entry.audioDataUrl;
        audioEl.playbackRate = neededRate;
      }

      audioEl.muted = isMuted;

      if (!shouldPlay) {
        audioEl.pause();
        return;
      }

      if (localOffset >= 0 && localOffset < entry.durationSec / neededRate) {
        const targetAudioPos = localOffset * neededRate;
        if (Math.abs(audioEl.currentTime - targetAudioPos) > 0.35) {
          audioEl.currentTime = Math.max(0, targetAudioPos);
        }
        if (audioEl.paused) {
          audioEl.play().catch(() => {
            // Browser autoplay policy ignored until user gesture
          });
        }
      } else {
        if (!audioEl.paused && localOffset >= entry.durationSec / neededRate) {
          audioEl.pause();
        }
      }
    },
    [beatAudios, beats, getBeatIndexAtTime, isMuted]
  );

  const drawFrame = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const audioEl = audioRef.current;
      const speaking = Boolean(isPlaying && audioEl && !audioEl.paused);

      renderAnimationFrame({
        ctx,
        width: canvas.width,
        height: canvas.height,
        timeSec: t,
        beats,
        sceneConfig,
        beatAudioDurations,
        isSpeaking: speaking,
        showEndCredit,
        subtitleChunksByBeat,
      });
    },
    [beats, beatAudioDurations, isPlaying, sceneConfig, showEndCredit, subtitleChunksByBeat]
  );

  // Draw initial or updated frame whenever paused/scrubbed
  useEffect(() => {
    drawFrame(currentTime);
  }, [currentTime, drawFrame]);

  // Handle external beat jump requests (e.g., tapping a beat clip card)
  useEffect(() => {
    if (externalSeekSec !== null && externalSeekSec !== undefined) {
      const clamped = Math.max(0, Math.min(totalDuration - 0.05, externalSeekSec));
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
      activeAudioBeatRef.current = -1;
      setIsPlaying(true);
      syncAudioToTime(clamped, true);
      onClearExternalSeek?.();
    }
  }, [externalSeekSec, onClearExternalSeek, syncAudioToTime]);

  // Main animation playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = null;
      audioRef.current?.pause();
      return;
    }

    let lastBeatIdx = getBeatIndexAtTime(currentTimeRef.current);

    const tick = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const dt = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;

      const nextTime = currentTimeRef.current + dt;
      if (nextTime >= totalDuration) {
        currentTimeRef.current = totalDuration;
        setCurrentTime(totalDuration);
        setIsPlaying(false);
        audioRef.current?.pause();
        drawFrame(totalDuration);
        return;
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);

      const newBeatIdx = getBeatIndexAtTime(nextTime);
      if (newBeatIdx !== lastBeatIdx) {
        lastBeatIdx = newBeatIdx;
        onBeatChange?.(newBeatIdx);
      }

      syncAudioToTime(nextTime, true);
      drawFrame(nextTime);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = null;
    };
  }, [drawFrame, getBeatIndexAtTime, isPlaying, onBeatChange, syncAudioToTime]);

  const handleTogglePlay = () => {
    if (currentTimeRef.current >= totalDuration - 0.05) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
      activeAudioBeatRef.current = -1;
    }
    const next = !isPlaying;
    setIsPlaying(next);
    if (next) {
      syncAudioToTime(currentTimeRef.current, true);
    } else {
      audioRef.current?.pause();
    }
  };

  const handleRestart = () => {
    currentTimeRef.current = 0;
    setCurrentTime(0);
    activeAudioBeatRef.current = -1;
    setIsPlaying(true);
    syncAudioToTime(0, true);
    onBeatChange?.(0);
  };

  const handleScrub = (val: number) => {
    currentTimeRef.current = val;
    setCurrentTime(val);
    activeAudioBeatRef.current = -1;
    syncAudioToTime(val, isPlaying);
    onBeatChange?.(getBeatIndexAtTime(val));
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      audioElSetMuted(audioRef.current, next);
    }
  };

  const activeBeatIndex = getBeatIndexAtTime(currentTime);
  const activeBeat = beats[activeBeatIndex];

  return (
    <div className="bg-white rounded-3xl border border-[#D7E0DC] overflow-hidden shadow-sm">
      {/* Hidden audio element for natural TTS playback */}
      <audio ref={audioRef} preload="auto" />

      {/* 16:9 Canvas Stage */}
      <div className="relative aspect-video bg-[#1E292B] w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onClick={handleTogglePlay}
          className="w-full h-full object-contain cursor-pointer block"
        />

        {/* Center play affordance when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label="Play 30-second animated film"
            className="absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/25 transition-colors"
          >
            <span className="w-18 h-18 rounded-full bg-white/95 text-[#1E292B] flex items-center justify-center shadow-lg">
              <Play className="w-8 h-8 ml-1 fill-current" />
            </span>
          </button>
        )}
      </div>

      {/* Controls & 4-Beat Timeline */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Beat progress markers + scrubber */}
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {beats.map((b) => {
              const isCurrent = b.index === activeBeatIndex;
              return (
                <button
                  key={b.index}
                  type="button"
                  onClick={() => {
                    handleScrub(b.startSec);
                    if (!isPlaying) {
                      setIsPlaying(true);
                      syncAudioToTime(b.startSec, true);
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap truncate min-h-[40px] ${
                    isCurrent
                      ? 'bg-[#3F5E96] text-white'
                      : 'bg-[#EBF0ED] text-[#526063] hover:bg-[#DFE6E2] hover:text-[#1E292B]'
                  }`}
                >
                  {b.timeRange} · {b.role}
                </button>
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.05}
            value={currentTime}
            onChange={(e) => handleScrub(Number(e.target.value))}
            aria-label="Video timeline"
            className="w-full h-2.5 accent-[#3F5E96] cursor-pointer"
          />
        </div>

        {/* Transport bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-2xl bg-[#3F5E96] hover:bg-[#344F80] text-white font-semibold text-base transition-colors whitespace-nowrap"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Play 30s Clip</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart from beginning"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] rounded-2xl bg-[#EBF0ED] hover:bg-[#DFE6E2] text-[#1E292B] font-medium text-sm transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#EBF0ED] hover:bg-[#DFE6E2] text-[#1E292B] transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-[#526063] font-mono tabular-nums">
            <span>{activeBeat?.role}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#1E292B]">
              {Math.floor(currentTime)}s / 30s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function audioElSetMuted(el: HTMLAudioElement, muted: boolean) {
  el.muted = muted;
}
