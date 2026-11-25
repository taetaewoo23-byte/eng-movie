import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { CharacterDesign, SceneConfig, VisualStyle, VoiceOption } from '../types';
import {
  PLACE_SUGGESTIONS,
  SITUATION_SUGGESTIONS,
  STYLE_OPTIONS,
  VOICE_OPTIONS,
} from '../data/presets';

interface SceneStepProps {
  sceneConfig: SceneConfig;
  isGenerating: boolean;
  errorMsg: string | null;
  onChangeScene: (next: SceneConfig) => void;
  onBack: () => void;
  onGenerateStoryboard: () => void;
}

const OUTFIT_COLOR_SWATCHES = [
  { label: 'Periwinkle', hex: '#5B76A8' },
  { label: 'Sage', hex: '#699482' },
  { label: 'Soft Oat', hex: '#C7A98B' },
  { label: 'Dusty Rose', hex: '#B97D83' },
  { label: 'Slate', hex: '#526273' },
];

export function SceneStep({
  sceneConfig,
  isGenerating,
  errorMsg,
  onChangeScene,
  onBack,
  onGenerateStoryboard,
}: SceneStepProps) {
  const updateField = <K extends keyof SceneConfig>(key: K, value: SceneConfig[K]) => {
    onChangeScene({ ...sceneConfig, [key]: value });
  };

  const updateCharacter = (idx: number, patch: Partial<CharacterDesign>) => {
    const updated = sceneConfig.characterBible.map((c, i) =>
      i === idx ? { ...c, ...patch } : c
    );
    const names = updated.map((c) => c.name.trim()).filter(Boolean).join(' and ');
    onChangeScene({
      ...sceneConfig,
      characterBible: updated,
      characters: names ? `${names}, two Korean university friends` : sceneConfig.characters,
    });
  };

  const canSubmit =
    sceneConfig.place.trim().length > 0 &&
    sceneConfig.characters.trim().length > 0 &&
    sceneConfig.situation.trim().length > 0 &&
    !isGenerating;

  return (
    <section className="space-y-8 pb-24 sm:pb-12">
      {/* Heading */}
      <div className="space-y-2 max-w-2xl">
        <p className="text-sm font-medium text-[#3F5E96]">
          Step 2 of 5 · Scene & Visual Style
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E292B] tracking-tight text-balance">
          Set the stage, characters, and animation style
        </h1>
        <p className="text-base sm:text-lg text-[#526063] leading-relaxed">
          Original campus characters keep the exact same outfits and colors across all 4 beats.
        </p>
      </div>

      {/* Main Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Place, Characters, Situation */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#D7E0DC] p-5 sm:p-6 space-y-6">
          {/* Place */}
          <div className="space-y-2.5">
            <label htmlFor="scene-place" className="block text-lg font-semibold text-[#1E292B]">
              1. Place
            </label>
            <input
              id="scene-place"
              type="text"
              value={sceneConfig.place}
              onChange={(e) => updateField('place', e.target.value)}
              placeholder="e.g., Sunny campus coffee shop"
              className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base sm:text-lg text-[#1E292B] focus:bg-white focus:border-[#3F5E96]"
            />
            <div className="flex flex-wrap gap-2">
              {PLACE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateField('place', s)}
                  className={`px-3 py-2 min-h-[40px] rounded-xl text-sm font-medium transition-colors ${
                    sceneConfig.place === s
                      ? 'bg-[#3F5E96] text-white'
                      : 'bg-[#EBF0ED] text-[#3B494C] hover:bg-[#DFE6E2]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Characters + Locked Outfit Colors */}
          <div className="space-y-3 pt-2 border-t border-[#EBF0ED]">
            <label htmlFor="scene-characters" className="block text-lg font-semibold text-[#1E292B]">
              2. Characters (Original & Family-Friendly)
            </label>
            <input
              id="scene-characters"
              type="text"
              value={sceneConfig.characters}
              onChange={(e) => updateField('characters', e.target.value)}
              placeholder="e.g., Jisoo and Minho, two Korean university friends"
              className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base sm:text-lg text-[#1E292B] focus:bg-white focus:border-[#3F5E96]"
            />

            {/* Consistent Outfit Palette Lock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {sceneConfig.characterBible.map((char, idx) => (
                <div
                  key={char.id}
                  className="p-3.5 rounded-2xl bg-[#F6F8F7] border border-[#E0E7E4] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={char.name}
                      aria-label={`Character ${idx + 1} name`}
                      onChange={(e) => updateCharacter(idx, { name: e.target.value })}
                      className="font-semibold text-base text-[#1E292B] bg-white border border-[#D7E0DC] rounded-lg px-2.5 py-1.5 w-32"
                    />
                    <span className="text-xs text-[#526063]">
                      Outfit locked
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#526063]">Top color:</span>
                    <div className="flex items-center gap-1.5">
                      {OUTFIT_COLOR_SWATCHES.map((sw) => {
                        const selected = char.topColor === sw.hex;
                        return (
                          <button
                            key={sw.hex}
                            type="button"
                            aria-label={`${char.name} ${sw.label} outfit`}
                            onClick={() =>
                              updateCharacter(idx, {
                                topColor: sw.hex,
                                outfitSummary: `${sw.label.toLowerCase()} top, ${
                                  char.accessory === 'glasses' ? 'round glasses' : 'casual trousers'
                                }`,
                              })
                            }
                            style={{ backgroundColor: sw.hex }}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                              selected
                                ? 'border-[#1E292B] scale-110'
                                : 'border-white hover:scale-105'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Situation */}
          <div className="space-y-2.5 pt-2 border-t border-[#EBF0ED]">
            <label htmlFor="scene-situation" className="block text-lg font-semibold text-[#1E292B]">
              3. Situation
            </label>
            <textarea
              id="scene-situation"
              rows={3}
              value={sceneConfig.situation}
              onChange={(e) => updateField('situation', e.target.value)}
              placeholder="What happens in this 30-second moment?"
              className="w-full px-4 py-3 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base text-[#1E292B] focus:bg-white focus:border-[#3F5E96] leading-relaxed"
            />
            <div className="flex flex-wrap gap-2">
              {SITUATION_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateField('situation', s)}
                  className={`text-left px-3 py-2 min-h-[40px] rounded-xl text-sm font-medium transition-colors ${
                    sceneConfig.situation === s
                      ? 'bg-[#3F5E96] text-white'
                      : 'bg-[#EBF0ED] text-[#3B494C] hover:bg-[#DFE6E2]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Voice & Creator Credit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EBF0ED]">
            <div className="space-y-1.5">
              <label htmlFor="scene-voice" className="block text-base font-semibold text-[#1E292B]">
                English Voice
              </label>
              <select
                id="scene-voice"
                value={sceneConfig.voiceName}
                onChange={(e) => updateField('voiceName', e.target.value as VoiceOption)}
                className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base text-[#1E292B]"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {v.tone}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="creator-name" className="block text-base font-semibold text-[#1E292B]">
                Your Name (for film credit)
              </label>
              <input
                id="creator-name"
                type="text"
                value={sceneConfig.creatorName}
                onChange={(e) => updateField('creatorName', e.target.value)}
                placeholder="e.g., Minji Kim"
                className="w-full min-h-[50px] px-4 py-2.5 rounded-xl bg-[#F6F8F7] border border-[#D7E0DC] text-base text-[#1E292B]"
              />
            </div>
          </div>
        </div>

        {/* Right: Visual Style Menu (4 styles) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-lg font-semibold text-[#1E292B] px-1">
            4. Visual Style Menu
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {STYLE_OPTIONS.map((opt) => {
              const selected = sceneConfig.style === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateField('style', opt.id as VisualStyle)}
                  className={`text-left rounded-2xl border overflow-hidden transition-colors flex flex-row items-stretch min-h-[108px] ${
                    selected
                      ? 'bg-[#EEF3FA] border-[#3F5E96] ring-2 ring-[#3F5E96]/25'
                      : 'bg-white border-[#D7E0DC] hover:border-[#9EB0BA]'
                  }`}
                >
                  <div className="w-28 sm:w-32 shrink-0 bg-[#EBF0ED] relative overflow-hidden">
                    <img
                      src={opt.imageUrl}
                      alt={`${opt.label} visual style sample`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-center gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-lg text-[#1E292B]">
                        {opt.label}
                      </span>
                      {selected && (
                        <span className="w-6 h-6 rounded-full bg-[#3F5E96] text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#526063]">{opt.koreanNote}</span>
                    <p className="text-sm text-[#526063] leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
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
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 px-5 py-4 min-h-[54px] rounded-2xl bg-[#EBF0ED] hover:bg-[#DFE6E2] text-[#1E292B] font-semibold text-base transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onGenerateStoryboard}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[54px] rounded-2xl bg-[#3F5E96] hover:bg-[#344F80] disabled:bg-[#B8C4D4] disabled:cursor-not-allowed text-white font-semibold text-lg transition-colors whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Writing 4-Beat Story...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Write Storyboard</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
