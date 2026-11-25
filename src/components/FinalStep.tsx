import { useState } from 'react';
import { ArrowLeft, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { Beat, BeatAudio, ExpressionItem, SceneConfig } from '../types';
import { CompositeVideoPlayer } from './CompositeVideoPlayer';
import { exportCompositeVideo } from '../engine/videoExporter';
import { isExpressionPresentExact } from '../utils/textHelpers';

interface FinalStepProps {
  beats: Beat[];
  beatAudios: BeatAudio[];
  expressions: ExpressionItem[];
  sceneConfig: SceneConfig;
  onUpdateCreatorName: (name: string) => void;
  onBackToVideo: () => void;
  onStartNew: () => void;
}

export function FinalStep({
  beats,
  beatAudios,
  expressions,
  sceneConfig,
  onUpdateCreatorName,
  onBackToVideo,
  onStartNew,
}: FinalStepProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);

  const displayName = sceneConfig.creatorName.trim() || 'You';
  const activeExpressions = expressions.filter((e) => e.phrase.trim().length > 0);

  const handleDownloadVideo = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportDone(false);
    setExportProgress(0);
    setExportLabel('Starting export...');

    try {
      const { blob, extension } = await exportCompositeVideo({
        beats,
        beatAudios,
        sceneConfig,
        onProgress: (pct, label) => {
          setExportProgress(pct);
          setExportLabel(label);
        },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-im-30s-film.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setExportDone(true);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Unable to export video in this browser.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadScript = () => {
    const lines = [
      'my im — 30-Second English Short Film',
      `Made with Google AI Studio · Script by ${displayName}`,
      `Style: ${sceneConfig.style} | Place: ${sceneConfig.place}`,
      '',
      '--- EXPRESSIONS ---',
      ...activeExpressions.map(
        (e, i) => `${i + 1}. ${e.phrase}${e.meaning ? ` — ${e.meaning}` : ''}`
      ),
      '',
      '--- 4-BEAT STORYBOARD ---',
      ...beats.flatMap((b) => [
        `[${b.timeRange} ${b.role}]`,
        `Scene: ${b.sceneDescription}`,
        `Lines: ${b.englishLines}`,
        '',
      ]),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-im-script.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  return (
    <section className="space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2 max-w-3xl">
        <p className="text-sm font-medium text-[#3F5E96]">
          Step 5 of 5 · Your Finished Film
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E292B] tracking-tight text-balance">
          Your 30-second animated English clip is ready
        </h1>
        <p className="text-base sm:text-lg text-[#526063] leading-relaxed">
          Play it anytime, download the video with voice and subtitles, or review your movie expressions below.
        </p>
      </div>

      {/* Theater Video Player */}
      <CompositeVideoPlayer
        beats={beats}
        beatAudios={beatAudios}
        sceneConfig={sceneConfig}
        showEndCredit={true}
      />

      {/* Credit & Download Action Card */}
      <div className="bg-white rounded-3xl border border-[#D7E0DC] p-5 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EBF0ED]">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#526063]">Film Credit</p>
            <p className="font-display text-xl sm:text-2xl font-semibold text-[#1E292B]">
              Made with Google AI Studio · Script by {displayName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="final-creator-name" className="text-sm text-[#526063] shrink-0">
              Your Name:
            </label>
            <input
              id="final-creator-name"
              type="text"
              value={sceneConfig.creatorName}
              onChange={(e) => onUpdateCreatorName(e.target.value)}
              placeholder="Your Name"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base text-[#1E292B] w-44"
            />
          </div>
        </div>

        {/* Download Progress */}
        {isExporting && (
          <div className="p-4 rounded-2xl bg-[#EEF3FA] border border-[#C7D6ED] space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-[#1E292B]">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#3F5E96]" />
                {exportLabel}
              </span>
              <span className="font-mono tabular-nums">{exportProgress}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white overflow-hidden">
              <div
                className="h-full bg-[#3F5E96] transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {exportDone && !isExporting && (
          <div className="p-4 rounded-2xl bg-[#ECF6F1] border border-[#BDE0CE] text-[#154937] text-base font-medium flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#2F7D63] shrink-0" />
            <span>Your 30-second video with English voice and subtitles has been downloaded.</span>
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#E5B8B8] text-[#8C2D2D] text-base font-medium"
          >
            {exportError}
          </div>
        )}

        {/* Primary & Secondary Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadVideo}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[56px] rounded-2xl bg-[#3F5E96] hover:bg-[#344F80] disabled:bg-[#B8C4D4] text-white font-semibold text-lg transition-colors whitespace-nowrap"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Rendering Video...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download 30s Video</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadScript}
            className="inline-flex items-center justify-center gap-2 px-6 py-4 min-h-[56px] rounded-2xl bg-[#EBF0ED] hover:bg-[#DFE6E2] text-[#1E292B] font-semibold text-base transition-colors whitespace-nowrap"
          >
            <FileText className="w-5 h-5" />
            <span>Download Study Script</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={onBackToVideo}
            className="inline-flex items-center justify-center gap-2 px-5 py-4 min-h-[56px] rounded-2xl bg-transparent hover:bg-[#EBF0ED] text-[#526063] hover:text-[#1E292B] font-medium text-base transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Video</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={onStartNew}
            className="sm:ml-auto inline-flex items-center justify-center px-5 py-4 min-h-[56px] rounded-2xl border border-[#D7E0DC] hover:bg-[#EBF0ED] text-[#1E292B] font-medium text-base transition-colors whitespace-nowrap"
          >
            Make Another Film
          </button>
        </div>
      </div>

      {/* Study Recap of Learned Expressions */}
      <div className="bg-white rounded-3xl border border-[#D7E0DC] p-5 sm:p-6 space-y-4">
        <h2 className="text-xl font-semibold text-[#1E292B]">
          Expressions Featured in Your Film
        </h2>
        <div className="divide-y divide-[#EBF0ED]">
          {activeExpressions.map((expr) => {
            const matchedBeat = beats.find((b) =>
              isExpressionPresentExact(b.englishLines, expr.phrase)
            );
            return (
              <div
                key={expr.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="text-lg font-semibold text-[#1E292B]">
                    {expr.phrase}
                  </div>
                  {expr.meaning && (
                    <div className="text-base text-[#526063]">{expr.meaning}</div>
                  )}
                </div>
                <div className="text-sm text-[#3F5E96] font-mono tabular-nums">
                  {matchedBeat
                    ? `${matchedBeat.timeRange} · ${matchedBeat.role}`
                    : 'Included in script'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
