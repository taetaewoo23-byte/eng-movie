import { Plus, Trash2, ArrowRight, Film } from 'lucide-react';
import { ExpressionItem } from '../types';
import { MOVIE_PACKS, MoviePack } from '../data/presets';

interface ExpressionsStepProps {
  expressions: ExpressionItem[];
  selectedPackId: string | null;
  onChangeExpressions: (next: ExpressionItem[]) => void;
  onSelectPack: (pack: MoviePack) => void;
  onNext: () => void;
}

export function ExpressionsStep({
  expressions,
  selectedPackId,
  onChangeExpressions,
  onSelectPack,
  onNext,
}: ExpressionsStepProps) {
  const filledCount = expressions.filter((e) => e.phrase.trim().length > 0).length;
  const canProceed = filledCount >= 4;

  const handleUpdate = (id: string, field: 'phrase' | 'meaning', value: string) => {
    onChangeExpressions(
      expressions.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddRow = () => {
    onChangeExpressions([
      ...expressions,
      {
        id: `expr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        phrase: '',
        meaning: '',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (expressions.length <= 5) return;
    onChangeExpressions(expressions.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    onChangeExpressions(
      Array.from({ length: 5 }, (_, idx) => ({
        id: `expr-empty-${Date.now()}-${idx}`,
        phrase: '',
        meaning: '',
      }))
    );
  };

  return (
    <section className="space-y-8 pb-24 sm:pb-12">
      {/* Intro Heading */}
      <div className="space-y-2 max-w-2xl">
        <p className="text-sm font-medium text-[#3F5E96]">
          Step 1 of 5 · Expressions
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E292B] tracking-tight text-balance">
          Which movie expressions do you want to bring to life?
        </h1>
        <p className="text-base sm:text-lg text-[#526063] leading-relaxed">
          Enter at least 5 expressions (or pick a movie pack below). Every expression will appear word-for-word in your 30-second animated film.
        </p>
      </div>

      {/* Movie Starter Packs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-[#1E292B]">
            Quick Movie Packs
          </h2>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm font-medium text-[#526063] hover:text-[#1E292B] underline underline-offset-4 min-h-[40px] px-2"
          >
            Clear all fields
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MOVIE_PACKS.map((pack) => {
            const active = selectedPackId === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => onSelectPack(pack)}
                className={`text-left p-4 rounded-2xl border transition-colors min-h-[84px] flex flex-col justify-between ${
                  active
                    ? 'bg-[#EEF3FA] border-[#3F5E96] text-[#1E292B]'
                    : 'bg-white border-[#D7E0DC] hover:border-[#9EB0BA] text-[#1E292B]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-lg">
                    {pack.title}
                  </span>
                  <Film className={`w-4 h-4 shrink-0 ${active ? 'text-[#3F5E96]' : 'text-[#738285]'}`} />
                </div>
                <span className="text-sm text-[#526063] mt-1">
                  {pack.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expression Input List (Minimum 5 rows always visible) */}
      <div className="bg-white rounded-3xl border border-[#D7E0DC] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EBF0ED]">
          <h2 className="text-lg font-semibold text-[#1E292B]">
            Your Expression List
          </h2>
          <span className="text-sm text-[#526063] font-mono tabular-nums">
            {filledCount} filled · {expressions.length} fields
          </span>
        </div>

        <div className="space-y-3">
          {expressions.map((item, idx) => (
            <div
              key={item.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start pb-3 border-b border-[#F0F4F2] last:border-b-0 last:pb-0"
            >
              <div className="md:col-span-6 space-y-1">
                <label
                  htmlFor={`expr-phrase-${item.id}`}
                  className="block text-sm font-medium text-[#526063]"
                >
                  Expression {idx + 1}
                </label>
                <input
                  id={`expr-phrase-${item.id}`}
                  type="text"
                  value={item.phrase}
                  onChange={(e) => handleUpdate(item.id, 'phrase', e.target.value)}
                  placeholder="e.g., I've got butterflies (in my stomach)"
                  className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base sm:text-lg text-[#1E292B] placeholder:text-[#96A3A5] focus:bg-white focus:border-[#3F5E96] transition-colors"
                />
              </div>

              <div className="md:col-span-5 space-y-1">
                <label
                  htmlFor={`expr-meaning-${item.id}`}
                  className="block text-sm font-medium text-[#526063]"
                >
                  Korean meaning (optional)
                </label>
                <input
                  id={`expr-meaning-${item.id}`}
                  type="text"
                  value={item.meaning}
                  onChange={(e) => handleUpdate(item.id, 'meaning', e.target.value)}
                  placeholder="예: 긴장돼서 떨려"
                  className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base text-[#1E292B] placeholder:text-[#96A3A5] focus:bg-white focus:border-[#3F5E96] transition-colors"
                />
              </div>

              <div className="md:col-span-1 flex md:justify-end md:pt-7">
                <button
                  type="button"
                  onClick={() => handleRemoveRow(item.id)}
                  disabled={expressions.length <= 5}
                  aria-label={`Remove expression ${idx + 1}`}
                  className={`min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center transition-colors ${
                    expressions.length <= 5
                      ? 'text-[#C2CCCC] cursor-not-allowed'
                      : 'text-[#6A787A] hover:bg-[#FDECEC] hover:text-[#B43C3C]'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[48px] rounded-2xl bg-[#EBF0ED] hover:bg-[#DFE6E2] text-[#1E292B] font-medium text-base transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add expression</span>
          </button>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="fixed bottom-0 left-0 right-0 sm:static p-4 sm:p-0 bg-[#F6F8F7]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-[#D7E0DC] sm:border-t-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {!canProceed ? (
            <p className="text-sm font-medium text-[#9A5B25]">
              Please enter at least 4 English expressions to continue.
            </p>
          ) : (
            <p className="hidden sm:block text-sm text-[#526063]">
              Ready · {filledCount} expressions will appear verbatim in your story
            </p>
          )}
          <button
            type="button"
            disabled={!canProceed}
            onClick={onNext}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[54px] rounded-2xl bg-[#3F5E96] hover:bg-[#344F80] disabled:bg-[#B8C4D4] disabled:cursor-not-allowed text-white font-semibold text-lg transition-colors whitespace-nowrap"
          >
            <span>Next: Scene & Style</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
