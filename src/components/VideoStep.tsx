import { useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Palette } from 'lucide-react';
import { Beat, BeatAudio, ExpressionItem, SceneConfig } from '../types';
import { CompositeVideoPlayer } from './CompositeVideoPlayer';
import { segmentTextWithExpressions } from '../utils/textHelpers';

interface VideoStepProps {
  beats: Beat[];
  beatAudios: BeatAudio[];
  expressions: ExpressionItem[];
  sceneConfig: SceneConfig;
  onBack: () => void;
  onNextFinal: () => void;
}

export function VideoStep({
  beats,
  beatAudios,
  expressions,
  sceneConfig,
  onBack,
  onNextFinal,
}: VideoStepProps) {
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [seekSec, setSeekSec] = useState<number | null>(null);
  const activeExpressions = expressions.filter((e) => e.phrase.trim().length > 0);

  return (
    <section className="space-y-8 pb-24 sm:pb-12">
      {/* Header */}
      <div className="space-y-2 max-w-3xl">
        <p className="text-sm font-medium text-[#3F5E96]">
          Step 4 of 5 · 30-Second Animated Video
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E292B] tracking-tight text-balance">
          Watch all 4 beats play together as one 30s film
        </h1>
        <p className="text-base sm:text-lg text-[#526063] leading-relaxed">
          Rendered in <span className="font-semibold text-[#1E292B]">{sceneConfig.style}</span> with natural English voice and burned-in subtitles.
        </p>
      </div>

      {/* Main Layout: 30s Video Player + Character & Beat Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          <CompositeVideoPlayer
            beats={beats}
            beatAudios={beatAudios}
            sceneConfig={sceneConfig}
            onBeatChange={setActiveBeatIndex}
            externalSeekSec={seekSec}
            onClearExternalSeek={() => setSeekSec(null)}
          />
        </div>

        {/* Right: Consistent Character Lock + 4 Beat Clips */}
        <div className="lg:col-span-4 space-y-4">
          {/* Locked Character & Palette Card */}
          <div className="bg-white rounded-3xl border border-[#D7E0DC] p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1E292B]">
              <Palette className="w-4 h-4 text-[#3F5E96]" />
              <span>Consistent Characters & Colors</span>
            </div>
            <div className="space-y-2.5">
              {sceneConfig.characterBible.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-3 text-sm text-[#526063]"
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: char.topColor }}
                    className="w-5 h-5 rounded-full border border-[#D7E0DC] shrink-0"
                  />
                  <span className="font-semibold text-[#1E292B]">{char.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{char.outfitSummary}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Beat Clip Cards */}
          <div className="bg-white rounded-3xl border border-[#D7E0DC] p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#1E292B]">
              4 Beat Clips in Order
            </h2>
            <div className="space-y-2.5">
              {beats.map((beat) => {
                const isActive = beat.index === activeBeatIndex;
                const segments = segmentTextWithExpressions(
                  beat.englishLines,
                  activeExpressions
                );
                return (
                  <button
                    key={beat.index}
                    type="button"
                    onClick={() => {
                      setActiveBeatIndex(beat.index);
                      setSeekSec(beat.startSec);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-colors space-y-1.5 ${
                      isActive
                        ? 'bg-[#EEF3FA] border-[#3F5E96]'
                        : 'bg-[#F6F8F7] border-[#E0E7E4] hover:border-[#9EB0BA]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#1E292B] font-mono tabular-nums">
                        {beat.timeRange} · {beat.role}
                      </span>
                      <Play className="w-4 h-4 text-[#3F5E96] shrink-0" />
                    </div>
                    <p className="text-sm text-[#3B494C] leading-snug">
                      {segments.map((seg, i) =>
                        seg.highlighted ? (
                          <span
                            key={i}
                            className="font-semibold text-[#154937] underline decoration-[#2F7D63] underline-offset-2"
                          >
                            {seg.text}
                          </span>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 sm:static p-4 sm:p-0 bg-[#F6F8F7]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-[#D7E0DC] sm:border-t-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 px-5 py-4 min-h-[54px] rounded-2xl bg-[#EBF0ED] hover:bg-[#DFE6E2] text-[#1E292B] font-semibold text-base transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Edit Storyboard</span>
          </button>

          <button
            type="button"
            onClick={onNextFinal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[54px] rounded-2xl bg-[#3F5E96] hover:bg-[#344F80] text-white font-semibold text-lg transition-colors whitespace-nowrap"
          >
            <span>Final Screen & Download</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
