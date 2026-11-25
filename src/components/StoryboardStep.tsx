import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Beat, ExpressionItem } from '../types';
import {
  countTotalStoryboardWords,
  countWords,
  isExpressionPresentExact,
  segmentTextWithExpressions,
} from '../utils/textHelpers';

interface StoryboardStepProps {
  beats: Beat[];
  expressions: ExpressionItem[];
  regeneratingBeatIndex: number | null;
  isPreparingVideo: boolean;
  errorMsg: string | null;
  onUpdateBeat: (index: number, patch: Partial<Beat>) => void;
  onRegenerateBeat: (index: number) => void;
  onBack: () => void;
  onCreateVideo: () => void;
}

export function StoryboardStep({
  beats,
  expressions,
  regeneratingBeatIndex,
  isPreparingVideo,
  errorMsg,
  onUpdateBeat,
  onRegenerateBeat,
  onBack,
  onCreateVideo,
}: StoryboardStepProps) {
  const activeExpressions = expressions.filter((e) => e.phrase.trim().length > 0);
  const fullScript = beats.map((b) => b.englishLines).join(' ');
  const totalWords = countTotalStoryboardWords(beats);
  const inWordTarget = totalWords >= 60 && totalWords <= 70;

  const expressionChecks = activeExpressions.map((expr) => ({
    ...expr,
    included: isExpressionPresentExact(fullScript, expr.phrase),
  }));
  const missingCount = expressionChecks.filter((e) => !e.included).length;

  return (
    <section className="space-y-7 pb-24 sm:pb-12">
      {/* Header */}
      <div className="space-y-2 max-w-3xl">
        <p className="text-sm font-medium text-[#3F5E96]">
          Step 3 of 5 · 30-Second Storyboard
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E292B] tracking-tight text-balance">
          Review and fine-tune your 4 story beats
        </h1>
        <p className="text-base sm:text-lg text-[#526063] leading-relaxed">
          Edit any scene or English line directly, or regenerate one beat at a time. Target length is 60–70 words total.
        </p>
      </div>

      {/* Live Word Count & Exact Expression Checklist */}
      <div className="bg-white rounded-3xl border border-[#D7E0DC] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {inWordTarget ? (
              <CheckCircle2 className="w-5 h-5 text-[#2F7D63] shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#B46927] shrink-0" />
            )}
            <div className="text-base font-semibold text-[#1E292B] font-mono tabular-nums">
              {totalWords} words · Target: 60–70 words
            </div>
          </div>

          <span className="text-sm font-medium text-[#526063]">
            {inWordTarget
              ? 'Perfect 30-second pacing'
              : totalWords < 60
              ? `Add about ${60 - totalWords} more words`
              : `Trim about ${totalWords - 70} words`}
          </span>
        </div>

        <div className="pt-3 border-t border-[#EBF0ED] space-y-2">
          <div className="text-sm font-medium text-[#526063]">
            Expression Coverage ({activeExpressions.length - missingCount}/{activeExpressions.length} exact matches)
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {expressionChecks.map((item) => (
              <div
                key={item.id}
                className="inline-flex items-center gap-1.5 text-sm"
              >
                {item.included ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2F7D63] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#B43C3C] shrink-0" />
                )}
                <span
                  className={
                    item.included
                      ? 'font-semibold text-[#1E292B] underline decoration-[#2F7D63]/60 decoration-2 underline-offset-4'
                      : 'font-medium text-[#B43C3C]'
                  }
                >
                  {item.phrase}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Beat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {beats.map((beat) => {
          const isRegen = regeneratingBeatIndex === beat.index;
          const beatWords = countWords(beat.englishLines);
          const segments = segmentTextWithExpressions(
            beat.englishLines,
            activeExpressions
          );

          return (
            <article
              key={beat.index}
              className="bg-white rounded-3xl border border-[#D7E0DC] p-5 sm:p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-4">
                {/* Beat Header + Regenerate Button */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EBF0ED]">
                  <div className="flex items-center gap-2 text-base font-semibold text-[#1E292B]">
                    <span className="font-mono tabular-nums text-[#3F5E96]">
                      {beat.timeRange}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{beat.role}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-sm font-normal text-[#526063] font-mono tabular-nums">
                      {beatWords} words
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={regeneratingBeatIndex !== null || isPreparingVideo}
                    onClick={() => onRegenerateBeat(beat.index)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] rounded-xl bg-[#EBF0ED] hover:bg-[#DFE6E2] disabled:opacity-50 text-sm font-medium text-[#1E292B] transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRegen ? 'animate-spin' : ''}`} />
                    <span>{isRegen ? 'Rewriting...' : 'Regenerate'}</span>
                  </button>
                </div>

                {/* Scene Description */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`beat-scene-${beat.index}`}
                    className="block text-sm font-semibold text-[#526063]"
                  >
                    Scene Description
                  </label>
                  <textarea
                    id={`beat-scene-${beat.index}`}
                    rows={2}
                    value={beat.sceneDescription}
                    onChange={(e) =>
                      onUpdateBeat(beat.index, { sceneDescription: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base text-[#1E292B] focus:bg-white focus:border-[#3F5E96] leading-relaxed"
                  />
                </div>

                {/* Spoken English Lines */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`beat-lines-${beat.index}`}
                    className="block text-sm font-semibold text-[#526063]"
                  >
                    English Lines (Voice & Subtitles)
                  </label>
                  <textarea
                    id={`beat-lines-${beat.index}`}
                    rows={3}
                    value={beat.englishLines}
                    onChange={(e) =>
                      onUpdateBeat(beat.index, {
                        englishLines: e.target.value,
                        subtitles: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base sm:text-lg font-medium text-[#1E292B] focus:bg-white focus:border-[#3F5E96] leading-relaxed"
                  />
                </div>

                {/* Subtitle & Highlighted Expressions Preview */}
                <div className="p-3.5 rounded-2xl bg-[#F0F4F2] space-y-1">
                  <div className="text-xs font-medium text-[#526063]">
                    Burned-in Subtitle & Expression Highlight Preview
                  </div>
                  <p className="text-base leading-relaxed text-[#1E292B]">
                    {segments.map((seg, i) =>
                      seg.highlighted ? (
                        <mark
                          key={i}
                          className="bg-[#D5EDE2] text-[#154937] font-semibold px-1.5 py-0.5 rounded-md underline decoration-[#2F7D63] decoration-2 underline-offset-4"
                        >
                          {seg.text}
                        </mark>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      )
                    )}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#E5B8B8] text-[#8C2D2D] text-base font-medium"
        >
          {errorMsg}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 sm:static p-4 sm:p-0 bg-[#F6F8F7]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-[#D7E0DC] sm:border-t-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isPreparingVideo}
            className="inline-flex items-center justify-center gap-2 px-5 py-4 min-h-[54px] rounded-2xl bg-[#EBF0ED] hover:bg-[#DFE6E2] text-[#1E292B] font-semibold text-base transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={isPreparingVideo || regeneratingBeatIndex !== null}
            onClick={onCreateVideo}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[54px] rounded-2xl bg-[#3F5E96] hover:bg-[#344F80] disabled:bg-[#B8C4D4] text-white font-semibold text-lg transition-colors whitespace-nowrap"
          >
            {isPreparingVideo ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Voice & Video...</span>
              </>
            ) : (
              <>
                <span>Create 30s Video</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
